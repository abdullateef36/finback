const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const payrollRoutes = require('./routes/payroll');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://akinolaabdulateef36:BsoJVJv7qCQMLSF4@cluster0.4i1we.mongodb.net/payroll');

app.use('/api/payroll', payrollRoutes);

app.listen(4000, () => console.log('Server running on port 4000'));