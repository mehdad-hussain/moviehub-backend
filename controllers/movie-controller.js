import Movie from "../models/movie.js";

// Create a new movie
export async function createMovie(req, res) {
  try {
    const { title, description, releaseDate, genre, imageUrl } = req.body;

    // Create new movie
    const movie = await Movie.create({
      title,
      description,
      releaseDate,
      genre: Array.isArray(genre) ? genre : [genre],
      imageUrl,
    });

    res.status(201).json(movie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get all movies
export async function getMovies(req, res) {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get a movie by ID
export async function getMovieById(req, res) {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Rate a movie
export async function rateMovie(req, res) {
  try {
    const { value } = req.body;
    const { id } = req.params;
    const userId = req.user._id;

    // Validate rating value
    if (!value || value < 1 || value > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    // Check if user has already rated this movie
    const existingRatingIndex = movie.ratings.findIndex(
      // eslint-disable-next-line style/arrow-parens
      (rating) => rating.user.toString() === userId.toString(),
    );

    if (existingRatingIndex !== -1) {
      // Update existing rating
      movie.ratings[existingRatingIndex].value = value;
    } else {
      // Add new rating
      movie.ratings.push({
        user: userId,
        value,
      });
    }

    // Save will trigger the pre-save hook to recalculate average
    await movie.save();

    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
