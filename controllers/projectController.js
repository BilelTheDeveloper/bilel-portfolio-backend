const Project = require('../models/Project');
const cloudinary = require('cloudinary').v2;

// @desc    Create new project (Linked to Cloudinary & MongoDB)
// @route   POST /api/projects
// @access  Private (Admin Only)
exports.createProject = async (req, res) => {
  let saved = false;
  try {
    const existing = req.params.id ? await Project.findById(req.params.id).select('+imagePublicId') : null;
    if (req.params.id && !existing) {
      if (req.file?.filename) await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    // 1. Extract text fields from req.body (Including NEW fields)
    const {
      title,
      category,
      description,
      link,
      tags,
      longDescription,
      isFeatured,
      features,    // NEW
      challenges,  // NEW
      solutions,   // NEW
      duration     // NEW
    } = req.body;

    const bounded = (value, max, required = false) => typeof value === 'string' && value.trim().length <= max && (!required || value.trim().length > 0);
    const optional = (value, max) => value === undefined || bounded(value, max);
    if (!bounded(title, 100, true) || !bounded(description, 500, true) ||
        !['Web Development', 'Meta Ads Case Study', 'UI/UX Design', 'Digital Marketing'].includes(category) ||
        !optional(longDescription, 10000) || !optional(challenges, 10000) || !optional(solutions, 10000) || !optional(duration, 100) ||
        !optional(link, 2048) || (link && !/^https?:\/\//i.test(link)) || !optional(features, 4000) ||
        (tags !== undefined && !(typeof tags === 'string' && tags.length <= 500))) {
      const error = new Error('Invalid project fields'); error.name = 'ValidationError'; throw error;
    }
    // 2. Critical Check: Ensure the Middleware actually uploaded the image
    if (!req.file && !existing) {
      return res.status(400).json({
        success: false,
        message: "Image upload failed. Please attach a mockup file."
      });
    }

    // 3. Data Formatting for Tags
    let projectTags = [];
    if (tags) {
      projectTags = Array.isArray(tags)
        ? tags
        : tags.split(',').map(t => t.trim());
    }

    // 4. Data Formatting for Features (From JSON string back to Array)
    let parsedFeatures = [];
    if (features) {
      try {
        parsedFeatures = JSON.parse(features);
      } catch (e) {
        // Fallback if it's sent as a simple string
        parsedFeatures = features.split(',').map(f => f.trim());
      }
    }

    if (!Array.isArray(parsedFeatures) || parsedFeatures.length > 30 || parsedFeatures.some(feature => !bounded(feature, 200, true))) {
      const error = new Error('Invalid project features'); error.name = 'ValidationError'; throw error;
    }
    // 5. Create the project in MongoDB with ALL fields
    const values = {
      title,
      category,
      description,
      longDescription: longDescription || "",
      ...(req.file ? { imagePublicId: req.file.filename, image: req.file.path } : {}),
      link,
      tags: projectTags,
      isFeatured: isFeatured === 'true' || isFeatured === true,

      // --- ðŸš€ SAVING NEW DETAILED FIELDS ---
      features: parsedFeatures,
      challenges: challenges || "",
      solutions: solutions || "",
      duration: duration || "",
      // -------------------------------------

    };
    const previousImage = existing?.imagePublicId;
    const project = existing ? await Object.assign(existing, values).save() : await Project.create(values);
    saved = true;
    if (req.file && previousImage && previousImage !== req.file.filename) await cloudinary.uploader.destroy(previousImage).catch(() => console.error('Previous project image cleanup failed.'));
    const data = project.toObject();
    delete data.imagePublicId;

    res.status(existing ? 200 : 201).json({
      success: true,
      data,
      message: "Project deployed successfully to Cloudinary & Portfolio."
    });

  } catch (error) {
    if (!saved && req.file?.filename) await cloudinary.uploader.destroy(req.file.filename).catch(() => console.error('Unused image cleanup failed.'));
    console.error('Project creation failed:', error.name);
    res.status(error.name === 'ValidationError' ? 400 : 500).json({
      success: false,
      message: error.name === 'ValidationError' ? 'Please check the project fields.' : 'Could not save project.',

    });
  }
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
exports.getProjects = async (req, res) => {
  try {
    // Sort by newest first
    const projects = await Project.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not fetch projects."
    });
  }
};

// @desc    Get single project by ID (CRITICAL for ProjectDetails page)
// @route   GET /api/projects/:id
// @access  Public
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching project details",

    });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin Only)
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select('+imagePublicId');

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    await project.deleteOne();
    if (project.imagePublicId) await cloudinary.uploader.destroy(project.imagePublicId).catch(() => console.error('Deleted project image cleanup failed.'));

    res.status(200).json({
      success: true,
      message: "Project removed from portfolio"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Delete failed",

    });
  }
};
