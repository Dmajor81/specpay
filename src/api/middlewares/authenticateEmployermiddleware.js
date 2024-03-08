const Employee = require("../models/employeeModel");
const Project = require("../models/projectModel");
const Department = require("../models/departmentModel");
const Task = require("../models/taskModel");

const checkEmployerAccess = async (req, res, next) => {
  try {
    // Assuming you have the creator's ID stored in the employee's database
    const creatorId = req.params.id;
    console.log("creatorId", creatorId);
    const employee = await Employee.findById(creatorId);

    // Check if the authenticated user has the same ID as the creator
    if (
      !employee ||
      employee.employerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "Unauthorized: You do not have access to this resource.",
      });
    }

    // If the user has the necessary permissions, proceed to the next middleware
    next();
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
const checkProjectAccess = async (req, res, next) => {
  try {
    // Assuming you have the creator's ID stored in the employee's database
    const creatorId = req.params.id;
    const project = await Project.findById(creatorId);

    // Check if the authenticated user has the same ID as the creator
    if (!project || project.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Unauthorized: You do not have access to this resource.",
      });
    }

    // If the user has the necessary permissions, proceed to the next middleware
    next();
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
const checkDepartmentAccess = async (req, res, next) => {
  try {
    // Assuming you have the creator's ID stored in the employee's database
    const creatorId = req.params.id;
    const department = await Department.findById(creatorId);

    // Check if the authenticated user has the same ID as the creator
    if (
      !department ||
      department.employerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "Unauthorized: You do not have access to this resource.",
      });
    }

    // If the user has the necessary permissions, proceed to the next middleware
    next();
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
const checkTaskAccess = async (req, res, next) => {
  try {
    // Assuming you have the creator's ID stored in the employee's database
    const creatorId = req.params.id;
    const task = await Task.findById(creatorId);

    // Check if the authenticated user has the same ID as the creator
    if (!task || task.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Unauthorized: You do not have access to this resource.",
      });
    }

    // If the user has the necessary permissions, proceed to the next middleware
    next();
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  checkEmployerAccess,
  checkProjectAccess,
  checkDepartmentAccess,
  checkTaskAccess,
};
