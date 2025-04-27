import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  },
);

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    releaseDate: {
      type: Date,
      required: true,
    },
    genre: {
      type: [String],
      required: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    ratings: [ratingSchema],
    averageRating: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Calculate average rating when a new rating is added
movieSchema.pre("save", function (next) {
  if (this.ratings && this.ratings.length > 0) {
    const totalRating = this.ratings.reduce((sum, rating) => sum + rating.value, 0);
    this.averageRating = totalRating / this.ratings.length;
  } else {
    this.averageRating = 0;
  }
  next();
});

const Movie = mongoose.model("Movie", movieSchema);

export default Movie;
