const Project = require('../models/Project');
const cloudinary = require('cloudinary').v2;
const { projectFields } = require('../services/projectFields');
const cleanup = async id => { if (id) await cloudinary.uploader.destroy(id).catch(() => console.error('Project image cleanup failed.')); };

exports.createProject = async (req, res) => {
  let saved = false;
  try {
    const existing = req.params.id ? await Project.findById(req.params.id).select('+imagePublicId') : null;
    if (req.params.id && !existing) {
      await cleanup(req.file?.filename);
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    const { values, errors } = projectFields(req.body);
    if (!req.file && !existing) errors.image = 'Choose a JPG, PNG or WebP cover image.';
    if (Object.keys(errors).length) {
      await cleanup(req.file?.filename);
      return res.status(400).json({ success: false, message: 'Please correct the highlighted fields.', errors });
    }
    if (req.file) Object.assign(values, { image: req.file.path, imagePublicId: req.file.filename });
    const previousImage = existing?.imagePublicId;
    const project = existing ? await Object.assign(existing, values).save() : await Project.create(values);
    saved = true;
    if (req.file && previousImage !== req.file.filename) await cleanup(previousImage);
    const data = project.toObject();
    delete data.imagePublicId;
    return res.status(existing ? 200 : 201).json({ success: true, data, message: existing ? 'Project updated.' : 'Project published.' });
  } catch (error) {
    if (!saved) await cleanup(req.file?.filename);
    console.error('Project save failed:', error.name);
    return res.status(error.name === 'ValidationError' ? 400 : 500).json({ success: false, message: error.name === 'ValidationError' ? 'Please check the project fields.' : 'Could not save your project. Please try again.' });
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
