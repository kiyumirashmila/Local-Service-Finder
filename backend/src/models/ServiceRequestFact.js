const mongoose = require("mongoose");

/**
 * Read-only schema that maps to the existing `service_requests_fact` collection.
 * No other collection is touched by this model.
 */
const serviceRequestFactSchema = new mongoose.Schema(
  {
    Request_ID:        { type: String, trim: true },
    Customer_ID:       { type: String, trim: true },
    Customer:          { type: String, trim: true },
    Provider_ID:       { type: String, trim: true },
    Service_ID:        { type: String, trim: true },
    service_name:      { type: String, trim: true },
    category:          { type: String, trim: true },
    district:          { type: String, trim: true },
    age_group:         { type: String, trim: true },
    is_loyal:          { type: mongoose.Schema.Types.Mixed },
    Date_Time:         { type: mongoose.Schema.Types.Mixed },
    Year:              { type: mongoose.Schema.Types.Mixed },
    Month:             { type: mongoose.Schema.Types.Mixed },
    Distance_km:       { type: Number },
    Distance_:         { type: Number },
    Response_Time_Mins:{ type: Number },
    Response_:         { type: Number },
    Final_Status:      { type: String, trim: true },
    Final_Stat:        { type: String, trim: true },
    Revenue_Amount:    { type: Number },
    Revenue_:          { type: Number },
    Commission_Earned: { type: Number },
    Commissi:          { type: Number },
    Week_ID:           { type: mongoose.Schema.Types.Mixed }
  },
  {
    collection: "service_requests_fact", // pin to the exact collection name
    timestamps: false                    // the collection has no createdAt/updatedAt
  }
);

module.exports = mongoose.model("ServiceRequestFact", serviceRequestFactSchema);
