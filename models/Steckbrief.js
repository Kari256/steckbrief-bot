import mongoose from "mongoose";

const steckbriefSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  geburtsdatum: {
    type: String,
    required: true
  },
  geschlecht: {
    type: String,
    required: true
  },
  gewicht: {
    type: String,
    default: ""
  },
  rasse: {
    type: String,
    default: ""
  },
  aussehen: {
    type: String,
    default: ""
  },
  charakter: {
    type: String,
    default: ""
  },
  krankheiten: {
    type: String,
    default: ""
  },
  bild: {
    type: String,
    default: ""
  },
  sonstiges: {
    type: String,
    default: ""
  },
  besitzer: {
    type: String,
    required: true // Discord User ID
  },
  verstorben: {
    type: Boolean,
    default: false
  },
  todesdatum: {
    type: String,
    default: ""
  },
  todesgrund: {
    type: String,
    default: ""
  },
  messageId: {
    type: String,
    default: ""
  },
  channelId: {
    type: String,
    default: ""
  },
  erstelltAm: {
    type: Date,
    default: Date.now
  },
  geaendertAm: {
    type: Date,
    default: Date.now
  }
});

// Name + Besitzer müssen einzigartig sein
steckbriefSchema.index({ name: 1, besitzer: 1 }, { unique: true });

export default mongoose.model("Steckbrief", steckbriefSchema);
