const mongoose = require("mongoose");

/**
 * Read-only schema that maps to the existing `service_requests_fact` collection.
 * No other collection is touched by this model.
 */
const serviceRequestFactSchema = new mongoose.Schema(
  {
    Request_ID:        { type: String, trim: true },
    Customer_ID:       { type: String, trim: true },
    Provider_ID:       { type: String, trim: true },
    Service_ID:        { type: String, trim: true },
    Date_Time:         { type: Date },
    Distance_km:       { type: Number },
    Response_Time_Mins:{ type: Number },
    Final_Status:      { type: String, trim: true },
    Revenue_Amount:    { type: Number },
    Commission_Earned: { type: Number },
    Week_ID:           { type: String, trim: true }
  },
  {
    collection: "service_requests_fact", // pin to the exact collection name
    timestamps: false                    // the collection has no createdAt/updatedAt
  }
);

module.exports = mongoose.model("ServiceRequestFact", serviceRequestFactSchema);
