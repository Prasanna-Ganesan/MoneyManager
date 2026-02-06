const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Models
const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    division: { type: String, enum: ['Office', 'Personal'], required: true },
    date: { type: Date, required: true },
    fromAccount: { type: String }, // for transfers
    toAccount: { type: String }, // for transfers
  },
  { timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

// Simple health check
app.get('/', (req, res) => {
  res.json({ message: 'Money Manager API running' });
});

// Create transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const tx = new Transaction(req.body);
    await tx.save();
    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get transactions with filters (division, category, type, date range)
app.get('/api/transactions', async (req, res) => {
  try {
    const { division, category, type, startDate, endDate } = req.query;
    const filter = {};
    if (division) filter.division = division;
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const txs = await Transaction.find(filter).sort({ date: -1 });
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update transaction (only within 12 hours of creation)
app.put('/api/transactions/:id', async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const now = new Date();
    const diffHours = (now - tx.createdAt) / (1000 * 60 * 60);
    if (diffHours > 12) {
      return res
        .status(403)
        .json({ error: 'Editing is allowed only within 12 hours of creation.' });
    }

    Object.assign(tx, req.body);
    await tx.save();
    res.json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Dashboard summary (groupBy=month|week|year)
app.get('/api/summary', async (req, res) => {
  try {
    const { groupBy } = req.query;
    let dateFormat;
    if (groupBy === 'year') {
      dateFormat = '%Y';
    } else if (groupBy === 'week') {
      dateFormat = '%Y-%V'; // ISO year-week
    } else {
      // default month
      dateFormat = '%Y-%m';
    }

    const summary = await Transaction.aggregate([
      {
        $group: {
          _id: {
            period: { $dateToString: { format: dateFormat, date: '$date' } },
            type: '$type',
          },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $group: {
          _id: '$_id.period',
          totals: {
            $push: { type: '$_id.type', totalAmount: '$totalAmount' },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Category summary
app.get('/api/summary/categories', async (req, res) => {
  try {
    const summary = await Transaction.aggregate([
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.category': 1 } },
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Account balances summary derived from transactions
app.get('/api/accounts/summary', async (req, res) => {
  try {
    const txs = await Transaction.find({});
    const balances = {};

    txs.forEach((tx) => {
      if (tx.type === 'income') {
        const acc = tx.toAccount || 'Main';
        balances[acc] = (balances[acc] || 0) + tx.amount;
      } else if (tx.type === 'expense') {
        const acc = tx.fromAccount || 'Main';
        balances[acc] = (balances[acc] || 0) - tx.amount;
      } else if (tx.type === 'transfer') {
        if (tx.fromAccount) {
          balances[tx.fromAccount] = (balances[tx.fromAccount] || 0) - tx.amount;
        }
        if (tx.toAccount) {
          balances[tx.toAccount] = (balances[tx.toAccount] || 0) + tx.amount;
        }
      }
    });

    const result = Object.keys(balances).map((name) => ({
      account: name,
      balance: balances[name],
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple seed route for demo data (not for production)
app.post('/api/dev/seed', async (req, res) => {
  try {
    await Transaction.deleteMany({});
    const now = new Date();
    const sample = [
      {
        type: 'income',
        amount: 50000,
        description: 'Salary for February',
        category: 'Salary',
        division: 'Office',
        date: now,
        toAccount: 'Bank',
      },
      {
        type: 'expense',
        amount: 2000,
        description: 'Fuel for car',
        category: 'Fuel',
        division: 'Office',
        date: now,
        fromAccount: 'Bank',
      },
      {
        type: 'expense',
        amount: 1500,
        description: 'Weekend movie',
        category: 'Movie',
        division: 'Personal',
        date: now,
        fromAccount: 'Bank',
      },
      {
        type: 'expense',
        amount: 3000,
        description: 'Grocery shopping',
        category: 'Food',
        division: 'Personal',
        date: now,
        fromAccount: 'Bank',
      },
      {
        type: 'transfer',
        amount: 10000,
        description: 'Transfer to savings',
        category: 'Transfer',
        division: 'Personal',
        date: now,
        fromAccount: 'Bank',
        toAccount: 'Savings',
      },
    ];
    const created = await Transaction.insertMany(sample);
    res.json({ inserted: created.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
  });


