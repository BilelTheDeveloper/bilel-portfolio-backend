const Project = require('../models/Project');

// @desc    Create new project (Linked to Cloudinary & MongoDB)
// @route   POST /api/projects
// @access  Private (Admin Only)
exports.createProject = async (req, res) => {
  try {
    // 1. Extract text fields from req.body
    const { title, category, description, link, tags, longDescription, isFeatured } = req.body;

    // 2. Critical Check: Ensure the Middleware actually uploaded the image
    // Multer-Cloudinary puts the secure URL in req.file.path
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "Image upload failed. Please attach a mockup file." 
      });
    }

    // 3. Data Formatting for Tags
    // If tags come as a string "React, Node", we convert to ["React", "Node"]
    let projectTags = [];
    if (tags) {
      projectTags = Array.isArray(tags) 
        ? tags 
        : tags.split(',').map(t => t.trim());
    }

    // 4. Create the project in MongoDB
    const project = await Project.create({
      title,
      category,
      description,
      longDescription: longDescription || "",
      image: req.file.path, // Use the secure Cloudinary URL
      link,
      tags: projectTags,
      isFeatured: isFeatured === 'true' || isFeatured === true, // Handle FormData boolean
      createdAt: Date.now()
    });

    res.status(201).json({
      success: true,
      data: project,
      message: "Project deployed successfully to Cloudinary & Portfolio."
    });

  } catch (error) {
    console.error("Project Create Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error: Could not save project.",
      error: error.message
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

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin Only)
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Note: In a future update, we can also delete the image from Cloudinary here
    await project.deleteOne();
    
    res.status(200).json({ 
      success: true, 
      message: "Project removed from portfolio" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Delete failed",
      error: error.message
    });
  }
};