require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const Transaction = require("./Transaction");

const app = express();
const port = process.env.PORT || 3000;

mongoose.connect(`${process.env.DATABASE_URL}`);
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to database"));

app.use(express.json());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.post("/split-payments/compute", async (req, res) => {
  const { ID, Amount, Currency, CustomerEmail, SplitInfo } = req.body;
  const transaction = new Transaction({
    ID,
    Amount,
    Currency,
    CustomerEmail,
    SplitInfo,
  });
  try {
    const newTransaction = await transaction.save();

    //collect arrays of different transaction types
    let flatArray = newTransaction.SplitInfo.filter(
      (item) => item.SplitType === "FLAT"
    );
    let percentageArray = newTransaction.SplitInfo.filter(
      (item) => item.SplitType === "PERCENTAGE"
    );
    let ratioArray = newTransaction.SplitInfo.filter(
      (item) => item.SplitType === "RATIO"
    );

    let totalRatio = 5;

    const sortedArray = flatArray.concat(percentageArray, ratioArray);

    let result = {
      ID: newTransaction.ID,
      Balance: newTransaction.Amount,
      SplitBreakdown: [],
    };
    // let Balance = newTransaction.Amount;
    // let SplitBreakdown = [];
    sortedArray.forEach((transaction) => {
      let { SplitBreakdown } = result;
      const { SplitType, SplitValue, SplitEntityId } = transaction;

      if (SplitType === "FLAT") {
        // Confirm that split Amount is not less than zero and is less than transaction amount
        if (SplitValue > newTransaction.Amount || SplitValue < 0) {
          throw Error(
            "Split amount value is either greater than transaction amount or less than zero"
          );
        }
        result.Balance = result.Balance - SplitValue;
        SplitBreakdown.push({ SplitEntityId, Amount: SplitValue });
      } else if (SplitType === "PERCENTAGE") {
        let amount = (SplitValue / 100) * result.Balance;

        // Confirm that split Amount is not less than zero and is less than transaction amount
        if (amount > newTransaction.Amount || amount < 0) {
          throw Error(
            "Split amount value is either greater than transaction amount or less than zero"
          );
        }
        SplitBreakdown.push({
          SplitEntityId,
          Amount: amount,
        });
        result.Balance = result.Balance - amount;
      }
      return result;
    });

    let ratioBalance = result.Balance;
    sortedArray.forEach((transaction) => {
      let { SplitBreakdown } = result;
      const { SplitType, SplitValue, SplitEntityId } = transaction;

      if (SplitType === "RATIO") {
        let amount = (SplitValue / totalRatio) * ratioBalance;

        // Confirm that split Amount is not less than zero and is less than transaction amount
        if (amount > newTransaction.Amount || amount < 0) {
          throw Error(
            "Split amount value is either greater than transaction amount or less than zero"
          );
        }
        SplitBreakdown.push({
          SplitEntityId,
          Amount: amount,
        });
        result.Balance = result.Balance - amount;
      }
      return result;
    });

    //To check if sum of all split amount values is greater than transaction amount
    if (result.Balance < 0) {
      throw Error("balance is zero");
    }
    res.status(200).send({ ...result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.listen(port, () => console.log("Server started"));
