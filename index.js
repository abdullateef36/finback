require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize fetch with dynamic import
let fetch;
(async () => {
  try {
    // Dynamically import node-fetch
    fetch = (await import('node-fetch')).default;

    // Middleware
    app.use(cors());
    app.use(bodyParser.json());

    // Helper function to fetch and display raw transaction data
    const fetchTransactions = async (accountId) => {
      try {
        console.log(`\nFetching transactions for account: ${accountId}`);
        const response = await fetch(`https://api.withmono.com/accounts/${accountId}/transactions?limit=100`, {
          method: "GET",
          headers: {
            "mono-sec-key": process.env.MONO_SECRET_KEY || "test_sk_O3Mxaqu1NcbmgYOSjvXK",
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!data || data.error) {
          console.error('Failed to fetch transactions:', data);
          return null;
        }

        // Display complete raw response from server
        console.log('\n=== COMPLETE TRANSACTION DATA FROM SERVER ===');
        console.dir(data, { depth: null, colors: true });
        console.log('=== END OF TRANSACTION DATA ===\n');

        return data;
      } catch (error) {
        console.error('Error fetching transactions:', error);
        return null;
      }
    };

    // Exchange code endpoint
    app.post('/api/mono/exchange-code', async (req, res) => {
      try {
        const { code } = req.body;
        console.log("Received code:", code);

        const response = await fetch("https://api.withmono.com/account/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "mono-sec-key": process.env.MONO_SECRET_KEY || "test_sk_O3Mxaqu1NcbmgYOSjvXK",
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();
        console.log("Account auth response:", data);

        if (!data?.id) {
          return res.status(400).json({ error: "Failed to fetch account ID", raw: data });
        }

        // After successful account linking, fetch and display transactions
        await fetchTransactions(data.id);

        return res.json({
          success: true,
          accountId: data.id,
          account: data
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error('Error in exchange-code:', msg);
        return res.status(500).json({ error: msg });
      }
    });

    // Transactions endpoint
    app.post('/api/mono/transactions', async (req, res) => {
      try {
        const { accountId } = req.body;
        const transactions = await fetchTransactions(accountId);

        if (!transactions) {
          return res.status(400).json({
            error: "Failed to fetch transactions",
            details: "Check server logs for more information"
          });
        }

        return res.json({
          success: true,
          transactions
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error('Error in transactions endpoint:', msg);
        return res.status(500).json({ error: msg });
      }
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Mono API endpoints available at http://localhost:${PORT}/api/mono`);
    });

  } catch (err) {
    console.error('Failed to initialize node-fetch:', err);
    process.exit(1);
  }
})();