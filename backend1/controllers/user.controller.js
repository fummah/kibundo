const db = require("../models");
const User = db.user;
const Teacher = db.teacher;
const Student = db.student;
const Role = db.role;
const Subject = db.subject;
const Class = db.class;

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: {
        exclude: ['password']
      },
      include: [
        {
          model: Role,
          as: "role", // 👈 MUST match the alias in your model
          attributes: { exclude: [] },
          required: true
        }
      ]
    });

    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Failed to get users" });
  }
};

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      
    });
    res.status(200).json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ message: "Failed to get roles" });
  }
};

exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.findAll({
      attributes: {},
      include: [
        {
          model: User,
          as: "userCreated", // 👈 MUST match the alias in your model
          attributes: { exclude: ['password'] },
          required: true
        },
        {
          model: Class,
          as: "class", // 👈 MUST match the alias in your model
          attributes: { exclude: [] },
          required: true
        }
      ]
    });

    res.status(200).json(subjects);
  } catch (err) {
    console.error("Error fetching subjects:", err);
    res.status(500).json({ message: "Failed to get subjects" });
  }
};

exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.findAll({
      attributes: {},
      include: [
        {
          model: User,
          as: "userCreated", // 👈 MUST match the alias in your model
          attributes: { exclude: ['password'] },
          required: true
        }
      ]
    });

    res.status(200).json(classes);
  } catch (err) {
    console.error("Error fetching classes:", err);
    res.status(500).json({ message: "Failed to get classes" });
  }
};

exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.findAll({
      attributes: {},
      include: [
        {
          model: User,
          as: "user", // 👈 MUST match the alias in your model
          attributes: { exclude: ['password'] },
          required: true
        },
         {
          model: Class,
          as: "class", // 👈 MUST match the alias in your model
          attributes: { exclude: [] },
          required: true
        }
      ]
    });

    res.status(200).json(teachers);
  } catch (err) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ message: "Failed to get teachers" });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      attributes: {},
      include: [
        {
          model: User,
          as: "user", // 👈 MUST match the alias in your model
          attributes: { exclude: ['password'] },
          required: true
        },
         {
          model: Class,
          as: "class", // 👈 MUST match the alias in your model
          attributes: { exclude: [] },
          required: true
        }
      ]
    });

    res.status(200).json(students);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ message: "Failed to get students" });
  }
};

exports.addteacher = async (req, res) => {
  try {
    const { user_id, class_id } = req.body;
const created_by = req.user.id;
    const newTeacher = await Teacher.create({
      user_id,
      class_id,
      created_by,
    });

    res.status(201).json({ message: "New teacher registered", teacher: newTeacher });
  } catch (err) {
    console.error("New teacher registered error:", err);
    res.status(500).json({ message: "Server error", error:err });
  }
};

exports.addstudent = async (req, res) => {
  try {
    const { user_id, class_id } = req.body;

    // Get created_by from JWT (set in middleware)
    const created_by = req.user.id;
    const newStudent = await Student.create({
      user_id,
      class_id,
      created_by,
    });

    res.status(201).json({ message: "New student registered", student: newStudent });
  } catch (err) {
    console.error("Student registration error:", err);
    res.status(500).json({ message: "Server error", error:err });
  }
};

exports.addclass = async (req, res) => {
  try {
    const { class_name } = req.body;
const created_by = req.user.id;
    const newClass = await Class.create({
      class_name,
      created_by,
    });

    res.status(201).json({ message: "New class registered", class: newClass });
  } catch (err) {
    console.error("New class registered error:", err);
    res.status(500).json({ message: "Server error", error:err });
  }
};

exports.addsubject = async (req, res) => {
  try {
    const { subject_name, class_id } = req.body;
const created_by = req.user.id;
    const newSubject = await Subject.create({
      subject_name,
      class_id,
      created_by,
    });

    res.status(201).json({ message: "New subject registered", subject: newSubject });
  } catch (err) {
    console.error("New subject registered error:", err);
    res.status(500).json({ message: "Server error", error:err });
  }
};

exports.getSubjectById = async (req, res) => {
  const { id } = req.params;

  try {
    const subject = await Subject.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'userCreated',
          attributes: { exclude: ['password'] }, // adjust fields
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'class_name'] // adjust based on your class model
        }
      ]
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    return res.status(200).json(subject);

  } catch (error) {
    console.error('Error fetching subject by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getStudentById = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await Student.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] }, // adjust fields
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'class_name'] // adjust based on your class model
        }
      ]
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json(student);

  } catch (error) {
    console.error('Error fetching student by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getTeacherById = async (req, res) => {
  const { id } = req.params;

  try {
    const teacher = await Teacher.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] }, // adjust fields
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'class_name'] // adjust based on your class model
        }
      ]
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    return res.status(200).json(teacher);

  } catch (error) {
    console.error('Error fetching teacher by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteSubject = async (req, res) => {
  const { id } = req.params;

  try {
    const subject = await Subject.findByPk(id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    await subject.destroy();

    return res.status(200).json({ message: 'Subject deleted successfully' });

  } catch (error) {
    console.error('Error deleting subject:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};