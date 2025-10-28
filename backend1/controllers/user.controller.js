const db = require("../models");
const Stripe = require("stripe");
const bcrypt = require("bcryptjs");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); 
const User = db.user;
const Teacher = db.teacher;
const Student = db.student;
const Role = db.role;
const Subject = db.subject;
const Class = db.class;
const Parent = db.parent;
const Product = db.product;
const Subscription = db.subscription;
const BlogPost = db.blogpost;
const Invoice = db.invoice;
const Coupon = db.coupon;
const Quiz = db.quiz;
const QuizItem = db.quizItem;
const Curriculum = db.curriculum;
const Worksheet = db.worksheet;
const State = db.state;
const StudentSubjects = db.student_subjects;
const AgentPromptSet = db.agentPromptSet;
const HomeworkScan = db.homeworkScan;
const AiAgentSettings = db.aiagentsettings;


exports.adduser = async (req, res) => {
  try {
    const { first_name, last_name, email,contact_number, role_id, state, class_id,parent_id, subjects } = req.body;


    // 2. Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const created_by = req.user.id;
    const generateRandomPassword = (length = 10) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!';
      let password = '';
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        password += chars[randomIndex];
      }
      return password;
    };
const temppass = generateRandomPassword();
     const password = await bcrypt.hash(temppass, 10);
    const newUser = await User.create({
      role_id,
      first_name,
      last_name,
      email,
      contact_number,
      state,
      password,
      
    });
    if(role_id == 1)
    {
       const newStudent = await Student.create({
      user_id:newUser.id,
      class_id:class_id,
      parent_id: parent_id || null,
      created_by,
    });

      // ✅ Generate username
  const username =
    (first_name.substring(0, 2) + last_name.substring(0, 1)).toLowerCase() +
    newUser.id;

  // ✅ Update the username field in users table
  await User.update(
    { username,plain_pass: temppass },
    { where: { id: newUser.id } }
  );

  // Optionally, include username in response
  newUser.username = username;

       if (subjects && Array.isArray(subjects) && subjects.length > 0) {
        const subjectMappings = subjects.map(subject_id => ({
          student_id: newStudent.id,
          subject_id: subject_id,
          created_by
        }));

        await StudentSubjects.bulkCreate(subjectMappings, { transaction: t });
      }
    }
    else if(role_id == 2)
    {
         const newParent = await Parent.create({
      user_id:newUser.id,      
      created_by,
    });
    }
        else if(role_id == 3)
    {
         const newTeacher = await Teacher.create({
      user_id:newUser.id,
      class_id:class_id,
      created_by,
    });
    }
       
  const userData = { ...newUser.toJSON() };
    delete userData.password;
    userData.password = generateRandomPassword();

    res.status(201).json({ message: "User registered", user: userData });
  } catch (err) {
    console.error("Adding user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get current logged-in user info
exports.getCurrentUser = async (req, res) => {
  try {
    console.log("🎯 Current user info:", {
      id: req.user.id,
      email: req.user.email,
      role_id: req.user.role_id
    });
    
    const user = await User.findByPk(req.user.id, {
      attributes: {
        exclude: ['password']
      },
      include: [
        {
          model: Role,
          as: "role",
          attributes: { exclude: [] },
          required: true
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching current user:", err);
    res.status(500).json({ message: "Failed to get current user" });
  }
};

// Debug endpoint to check specific user ID
exports.debugUser = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log("🎯 Debugging user ID:", userId);
    
    const user = await User.findByPk(userId, {
      attributes: {
        exclude: ['password']
      },
      include: [
        {
          model: Role,
          as: "role",
          attributes: { exclude: [] },
          required: false
        }
      ]
    });

    console.log("🎯 User found:", user ? {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role_id: user.role_id
    } : "NOT FOUND");

    res.status(200).json({ 
      found: !!user,
      user: user || null 
    });
  } catch (err) {
    console.error("Error debugging user:", err);
    res.status(500).json({ message: "Failed to debug user", error: err.message });
  }
};

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

    console.log("🎯 All users being returned:", users.map(u => ({
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      role_id: u.role_id
    })));

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
    const { user_id, userId, class_id, profile, interests, buddy } = req.body;

    // Get created_by from JWT (set in middleware)
    const created_by = req.user.id;
    
    // Support both user_id (admin) and userId (student self-registration)
    const finalUserId = user_id || userId;
    
    console.log('📝 Adding student with settings:', {
      finalUserId,
      class_id,
      profile,
      interests,
      buddy
    });
    
    const newStudent = await Student.create({
      user_id: finalUserId,
      class_id,
      created_by,
      profile: profile || null,
      interests: interests || null,
      buddy: buddy || null,
    });

    res.status(201).json({ 
      message: "New student registered", 
      student: newStudent,
      id: newStudent.id,
      _id: newStudent.id
    });
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

exports.getClassById = async (req, res) => {
  const { id } = req.params;

  try {
    const classData = await Class.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'userCreated',
          attributes: { exclude: ['password'] },
        }
      ]
    });

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    return res.status(200).json(classData);

  } catch (error) {
    console.error('Error fetching class by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
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
          model: Parent,
          as: 'parent',
          attributes: { exclude: ['password'] }, // adjust fields
            include: [
            {
              model: User,
              as: 'user',   // ✅ match alias in StudentSubjects.js
              attributes: { exclude: ['password'] }
            }
          ]
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'class_name'] // adjust based on your class model
        },
        {
          model: StudentSubjects,
          as: 'subject',
          attributes: ['id'],
          include: [
            {
              model: Subject,
              as: 'subject',   // ✅ match alias in StudentSubjects.js
              attributes: ['id', 'subject_name']
            }
          ]
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

exports.getParentById = async (req, res) => {
  const { id } = req.params;

  try {
    const parent = await Parent.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] }, // adjust fields
        }, {
          model: Student,
          as: 'student', // Parent → Student
          include: [
            {
              model: User,
              as: 'user', // Student → User
              attributes: { exclude: ['password'] }
            },
            {
               model: Class,
          as: 'class',
          attributes: ['id', 'class_name']
            }
          ]
        },
         {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: Product,
              as: 'product'
            }
          ]
        },
           {
          model: Invoice,
          as: 'invoice'
        }
      ]
    });

    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }

    return res.status(200).json(parent);

  } catch (error) {
    console.error('Error fetching parent by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAllParents = async (req, res) => {
  try {
    const parents = await Parent.findAll({
      attributes: {
        exclude: []
      },
         include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] }, // adjust fields
        }
      ]
   
    });

    res.status(200).json(parents);
  } catch (err) {
    console.error("Error fetching parents:", err);
    res.status(500).json({ message: "Failed to get parents" });
  }
};


exports.addparent = async (req, res) => {
  try {
    const { user_id } = req.body;
const created_by = req.user.id;
    const newParent = await Parent.create({
      user_id,
      created_by,
    });

    res.status(201).json({ message: "New parent registered", parent: newParent });
  } catch (err) {
    console.error("New parent registered error:", err);
    res.status(500).json({ message: "Server error", error:err });
  }
};

exports.addproduct = async (req, res) => {
  try {
    const { name, description, price, trial_period_days } = req.body;
    const created_by = req.user.id;

    // 1️⃣ Create product in Stripe
    const stripeProduct = await stripe.products.create({
      name,
      description,
    });

    // 2️⃣ Create price in Stripe (attach to product)
    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(price * 100), // price in cents
      currency: 'usd', // or your preferred currency
      product: stripeProduct.id,
    });

    // 3️⃣ Save product to your DB with stripe product id + local price
    const newProduct = await Product.create({
      stripe_product_id: stripeProduct.id,
      name,
      description,
      price,
      created_by,
    });

    // 4️⃣ Return response
    res.status(201).json({ 
      message: "New product registered",
      product: newProduct,
      stripe_product: stripeProduct,
      stripe_price: stripePrice
    });

  } catch (err) {
    console.error("New product registered error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      attributes: {
        exclude: []
      }
   
    });

    res.status(200).json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Failed to get products" });
  }
};

exports.getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findOne({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json(product);

  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.destroy();

    return res.status(200).json({ message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.addsubscription = async (req, res) => {
  try {
    const { parent_id, stripe_subscription_id,plan_id } = req.body;
const created_by = req.user.id;
    const newSubscription = await Subscription.create({
      parent_id, 
      stripe_subscription_id,
      plan_id,
      created_by,
    });

    res.status(201).json({ message: "New subscription registered", subscription: newSubscription });
  } catch (err) {
    console.error("New subscription registered error:", err);
    res.status(500).json({ message: "Server error", error:err });
  }
};
exports.getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      attributes: {
        exclude: []
      },
      include: [
        {
          model: Product,
          as: "product"
        },
          {
          model: Parent,
          as: 'subscription', 
          include: [
            {
              model: User,
              as: 'user', 
              attributes: { exclude: ['password'] }
            }
          ]
        }
      ]
   
    });

    res.status(200).json(subscriptions);
  } catch (err) {
    console.error("Error fetching subscriptions:", err);
    res.status(500).json({ message: "Failed to get subscriptions" });
  }
};

exports.getSubscriptionById = async (req, res) => {
  const { id } = req.params;

  try {
    const subscription = await Subscription.findOne({
      where: { id },
       include: [
        {
          model: Product,
          as: "product"
        },
        {
          model: Parent,
          as: 'subscription', // Parent → Student
          include: [
            {
              model: User,
              as: 'user', // Student → User
              attributes: { exclude: ['password'] }
            }
          ]
        }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    return res.status(200).json(subscription);

  } catch (error) {
    console.error('Error fetching subscription by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteSubscription = async (req, res) => {
  const { id } = req.params;

  try {
    const subscription = await Subscription.findByPk(id);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    await subscription.destroy();

    return res.status(200).json({ message: 'Subscription deleted successfully' });

  } catch (error) {
    console.error('Error deleting subscription:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
 
exports.addblogpost = async (req, res) => {
  try {
    const { title, body_md,body_html,audience, status,slug, tags, seo, author_id, scheduled_for } = req.body;
const created_by = req.user.id;
    const newBlogPost = await BlogPost.create({
     title, 
     body_md,
     body_html,
     audience, 
     slug,
     status, 
     tags, 
     seo, 
     author_id, 
     scheduled_for,
      created_by,
    });

    res.status(201).json({ message: "New blogpost registered", blogpost: newBlogPost });
  } catch (err) {
    console.error("New blogpost registered error:", err);
    res.status(500).json({ message: "Server error", error:err });
  }
};
exports.getAllBlogPosts = async (req, res) => {
  try {
    const blogposts = await BlogPost.findAll({
      attributes: {
        exclude: []
      }
   
    });
    res.json(blogposts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getBlogPostById = async (req, res) => {
  const { id } = req.params;

  try {
    const blogpost = await BlogPost.findOne({
      where: { id }
    });

    if (!blogpost) {
      return res.status(404).json({ message: 'BlogPost not found' });
    }

    return res.status(200).json(blogpost);

  } catch (error) {
    console.error('Error fetching blogpost by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteBlogPost = async (req, res) => {
  const { id } = req.params;

  try {
    const blogpost = await BlogPost.findByPk(id);

    if (!blogpost) {
      return res.status(404).json({ message: 'BlogPost not found' });
    }

    await blogpost.destroy();

    return res.status(200).json({ message: 'BlogPost deleted successfully' });

  } catch (error) {
    console.error('Error deleting blogpost:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Invoice

exports.addinvoice = async (req, res) => {
  try {
    const { parent_id, stripe_invoice_id,status,total_cents,lines, taxes } = req.body;
const created_by = req.user.id;
    const newInvoice = await Invoice.create({
    parent_id, 
    stripe_invoice_id,
    status,
    total_cents,
    lines, 
    taxes, 
    created_by,
    });

    res.status(201).json({ message: "New invoice created", invoice: newInvoice });
  } catch (err) {
    console.error("New invoice registered error:", err);
    res.status(500).json({ message: "Server error", error:err });
  }
};
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      attributes: {
        exclude: []
      },
       include: {
          model: Parent,
          as: 'invoice', // Parent → Student
          include: [
            {
              model: User,
              as: 'user', // Student → User
              attributes: { exclude: ['password'] }
            }
          ]
        }
   
    });
    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  const { id } = req.params;

  try {
    const invoice = await Invoice.findOne({
      where: { id },      
       include: {
          model: Parent,
          as: 'invoice', // Parent → Student
          include: [
            {
              model: User,
              as: 'user', // Student → User
              attributes: { exclude: ['password'] }
            }
          ]
        }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    return res.status(200).json(invoice);

  } catch (error) {
    console.error('Error fetching invoice by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteInvoice = async (req, res) => {
  const { id } = req.params;

  try {
    const invoice = await Invoice.findByPk(id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await invoice.destroy();

    return res.status(200).json({ message: 'Invoice deleted successfully' });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Coupon


exports.addcoupon = async (req, res) => {
  try {
    const { stripe_coupon_id, name,percent_off,amount_off_cents,currency, valid, metadata } = req.body;
const created_by = req.user.id;
    const newCoupon = await Coupon.create({
   stripe_coupon_id, 
   name,
   percent_off,
   amount_off_cents,
   currency, 
   valid, 
   metadata,
    created_by,
    });

    res.status(201).json({ message: "New coupon created", coupon: newCoupon });
  } catch (err) {
    console.error("New coupon error:", err);
    res.status(500).json({ message: "Server error", error:err });
  }
};
exports.getAllCoupons= async (req, res) => {
  try {
    const coupons = await Coupon.findAll({
      attributes: {
        exclude: []
      }
   
    });
    res.json(coupons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getCouponById = async (req, res) => {
  const { id } = req.params;

  try {
    const coupon = await Coupon.findOne({
      where: { id }
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    return res.status(200).json(coupon);

  } catch (error) {
    console.error('Error fetching coupon by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteCoupon = async (req, res) => {
  const { id } = req.params;

  try {
    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json({ message: 'coupon not found' });
    }

    await coupon.destroy();

    return res.status(200).json({ message: 'coupon deleted successfully' });

  } catch (error) {
    console.error('Error deleting coupon:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.addrole = async (req, res) => {
  try {
    const { role_name, permissions } = req.body;
const created_by = req.user.id;
    
    // Convert permissions array to JSON string if it's an array
    let permissionsValue = permissions;
    if (Array.isArray(permissions)) {
      permissionsValue = JSON.stringify(permissions);
    }

    const newRole = await Role.create({
   name:role_name, 
   permissions: permissionsValue,
    created_by,
    });

    res.status(201).json({ message: "New role created", role: newRole });
  } catch (err) {
    console.error("New role error:", err);
    res.status(500).json({ message: "Server error", error:err });
  }
};

// Update role
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, permissions } = req.body;

    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Convert permissions array to JSON string if it's an array
    let permissionsValue = permissions;
    if (Array.isArray(permissions)) {
      permissionsValue = JSON.stringify(permissions);
    }

    await role.update({
      name,
      permissions: permissionsValue,
    });

    res.json({ message: "Role updated successfully", role });
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete role
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    await role.destroy();

    res.json({ message: "Role deleted successfully" });
  } catch (err) {
    console.error("Error deleting role:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Create Quiz with Quiz Items
exports.addquiz = async (req, res) => {
  try {
    const { title, description,tags, subject, grade, bundesland, difficulty, objectives, status, items } = req.body;

    // 1️⃣ Create the quiz
    const created_by = req.user.id;
    const newQuiz = await Quiz.create(
      { title, description, tags, subject, grade,  bundesland, difficulty, objectives, status, created_by  });

    // 2️⃣ Create quiz items if provided
    if (Array.isArray(items) && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await QuizItem.create(
          {
            quiz_id: newQuiz.id,
            type: item.type,
            prompt: item.prompt,
            options: item.options,
            answer_key: item.answer_key,
            hints: item.hints,
            position: item.position ?? i
          }
        );
      }
    }


    return res.status(201).json({
      message: 'Quiz created successfully',
      quiz: newQuiz
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
    return res.status(500).json({ error: 'Failed to create quiz' });
  }
};

// 1️⃣ Get all quizzes
exports.getQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.findAll({
      include: [{ model: QuizItem, as: 'items' }],
      order: [['id', 'ASC']]
    });
    return res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

// 2️⃣ Get a single quiz by ID
exports.getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findByPk(id, {
      include: [{ model: QuizItem, as: 'items' }]
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    return res.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return res.status(500).json({ error: 'Failed to fetch quiz' });
  }
};

// 3️⃣ Delete a quiz (and its items)
exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete items first
    await QuizItem.destroy({ where: { quiz_id: id } });

    // Delete quiz
    const deleted = await Quiz.destroy({ where: { id } });


    if (!deleted) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    return res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return res.status(500).json({ error: 'Failed to delete quiz' });
  }
};


// Create Curriculum
exports.addcurriculum = async (req, res) => {
  try {
    const { bundesland, subject, grade, content, status = 'draft' } = req.body;

    // 1️⃣ Create the Curriculum
    const created_by = req.user.id;
    const newCurriculum = await Curriculum.create(
      { bundesland, subject, grade, content, status, created_by, published_at: status === 'published' ? new Date() : null  }
    );

    return res.status(201).json({
      message: 'Curriculum created successfully',
      curriculum: newCurriculum
    });
  } catch (error) {
    console.error('Error creating curriculum:', error);
    return res.status(500).json({ error: 'Failed to create curriculum' });
  }
};

// 1️⃣ Get all Curriculum
exports.getAllCurriculum = async (req, res) => {
  try {
    const curriculums = await Curriculum.findAll({
      include: []
    });
    return res.json(curriculums);
  } catch (error) {
    console.error('Error fetching curriculums:', error);
    return res.status(500).json({ error: 'Failed to fetch curriculums' });
  }
};

// 2️⃣ Get a single Curriculum by ID
exports.getCurriculumById = async (req, res) => {
  try {
    const { id } = req.params;
    const curriculum = await Curriculum.findByPk(id, {
      include: []
    });

    if (!curriculum) {
      return res.status(404).json({ error: 'Curriculum not found' });
    }

    return res.json(curriculum);
  } catch (error) {
    console.error('Error fetching Curriculum:', error);
    return res.status(500).json({ error: 'Failed to fetch Curriculum' });
  }
};

// 3️⃣ Delete a Curriculum
exports.deleteCurriculum = async (req, res) => {
  try {
    const { id } = req.params;


    // Delete Curriculum
    const deleted = await Curriculum.destroy({ where: { id }, transaction: t });


    if (!deleted) {
      return res.status(404).json({ error: 'Curriculum not found' });
    }

    return res.json({ message: 'Curriculum deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting Curriculum:', error);
    return res.status(500).json({ error: 'Failed to delete Curriculum' });
  }
};


// 1️⃣ Create Worksheet
exports.addWorksheet = async (req, res) => {
  try {
    const { title, description, subject, grade_level, file_url, status = 'draft' } = req.body;
    const created_by = req.user.id;

    const newWorksheet = await Worksheet.create({
      title,
      description,
      subject,
      grade_level,
      file_url,
      status,
      created_by,
      published_at: status === 'published' ? new Date() : null
    });

    return res.status(201).json({
      message: 'Worksheet created successfully',
      worksheet: newWorksheet
    });
  } catch (error) {
    console.error('Error creating worksheet:', error);
    return res.status(500).json({ error: 'Failed to create worksheet' });
  }
};

// 2️⃣ Get all Worksheets
exports.getAllWorksheets = async (req, res) => {
  try {
    const worksheets = await Worksheet.findAll({
      include: []
    });
    return res.json(worksheets);
  } catch (error) {
    console.error('Error fetching worksheets:', error);
    return res.status(500).json({ error: 'Failed to fetch worksheets' });
  }
};

// 3️⃣ Get a single Worksheet by ID
exports.getWorksheetById = async (req, res) => {
  try {
    const { id } = req.params;
    const worksheet = await Worksheet.findByPk(id, {
      include: []
    });

    if (!worksheet) {
      return res.status(404).json({ error: 'Worksheet not found' });
    }

    return res.json(worksheet);
  } catch (error) {
    console.error('Error fetching worksheet:', error);
    return res.status(500).json({ error: 'Failed to fetch worksheet' });
  }
};

// 4️⃣ Delete a Worksheet
exports.deleteWorksheet = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Worksheet.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ error: 'Worksheet not found' });
    }

    return res.json({ message: 'Worksheet deleted successfully' });
  } catch (error) {
    console.error('Error deleting worksheet:', error);
    return res.status(500).json({ error: 'Failed to delete worksheet' });
  }
};

exports.getAllStates = async (req,res) => {
     try {
    const states = await State.findAll({
     order: [['state_name', 'ASC']] 
    });
    return res.json(states);
  } catch (error) {
    console.error('Error fetching states:', error);
    return res.status(500).json({ error: 'Failed to fetch states' });
  }
}

exports.getAllAgents = async (req, res) => {
  try {
    const agents = await AgentPromptSet.findAll(); // No need for empty exclude
    res.json(agents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the record exists
    const agent = await AgentPromptSet.findByPk(id);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    // Delete the record
    await agent.destroy();
    res.json({ message: "Agent deleted successfully" });
  } catch (err) {
    console.error("Error deleting agent:", err);
    res.status(500).json({ message: err.message });
  }
};


exports.getPublicTables = async (req, res) => {
  try {
    const query = `
      SELECT UPPER(table_name) AS table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    const [results] = await db.sequelize.query(query);

    res.status(200).json({
      success: true,
      tables: results.map(r => r.table_name)
    });
  } catch (error) {
    console.error("Error fetching public tables:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.addAgent = async (req, res) => {
  try {
    const { agent_name, entities, grade, state, file_name = '', api = '' } = req.body;
    const created_by = req.user.id; // from logged-in user
    
    console.log("🎯 Creating agent:", {
      agent_name,
      created_by,
      user_id: req.user.id,
      user_email: req.user.email,
      user_role: req.user.role_id
    });
    
    // Check if user is admin (role_id = 10)
    if (req.user.role_id !== 10) {
      console.log("❌ Non-admin user attempted to create agent:", {
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role_id
      });
      return res.status(403).json({ 
        error: "Only administrators can create agents",
        message: "Access denied: Admin privileges required"
      });
    }

    // Create the AgentPromptSet
    const newAgent = await AgentPromptSet.create({
      name: agent_name,
      description: `Agent prompt set for ${agent_name}`,
      prompts: [], // start empty, or you can accept from req.body
      version: 'v1',
      stage: 'staging',
      created_by,
      entities,
      grade,
      state,
      file_name,
      api
    });

    return res.status(201).json({
      message: "Agent created successfully",
      agent: newAgent
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    return res.status(500).json({ error: "Failed to create agent" });
  }
};

  exports.getHomeworks = async (req, res) => {
  try {
    const { student_id } = req.query; // or req.params depending on your route setup

    console.log("📚 getHomeworks called with student_id:", student_id);

    let whereClause = {};
    if (student_id) {
      whereClause.student_id = student_id;
      console.log("📚 Filtering homework by student_id:", student_id);
    } else {
      console.log("⚠️ No student_id filter - fetching all homework");
    }

    const homeworks = await HomeworkScan.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });

    console.log("📚 Found", homeworks.length, "homework submissions");

    res.json(homeworks);
  } catch (err) {
    console.error("❌ Error fetching homeworks:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getStudentApiUsage = async (req, res) => {
  try {
    const { student_id } = req.query;

    console.log("💰 getStudentApiUsage called with student_id:", student_id);

    if (!student_id) {
      return res.status(400).json({ message: "student_id is required" });
    }

    // Get API usage statistics using raw SQL
    const db = require("../models");
    const { sequelize } = db;
    
    // Check if columns exist first
    console.log("💰 Checking for API usage columns...");
    try {
      const [columns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'homework_scans' 
        AND column_name IN ('api_tokens_used', 'api_cost_usd')
      `);
      
      console.log("💰 Columns found:", columns);
      
      const hasApiColumns = columns && columns.length === 2;
      
      if (!hasApiColumns) {
        console.warn("⚠️ API usage columns not found in homework_scans table. Please run the migration.");
        return res.json({
          studentId: student_id,
          totalScans: 0,
          totalTokens: 0,
          totalCost: 0,
          avgTokensPerScan: 0,
          avgCostPerScan: 0,
          costToday: 0,
          costThisMonth: 0,
          lastScanDate: null,
          needsMigration: true,
          requiresMigration: true
        });
      }
    } catch (columnCheckErr) {
      console.error("❌ Error checking columns:", columnCheckErr);
      throw columnCheckErr;
    }
    
    console.log("💰 Fetching API usage statistics...");
    const [results] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_scans,
        SUM(COALESCE(api_tokens_used, 0)) as total_tokens,
        SUM(COALESCE(api_cost_usd, 0)) as total_cost,
        AVG(COALESCE(api_tokens_used, 0)) as avg_tokens_per_scan,
        AVG(COALESCE(api_cost_usd, 0)) as avg_cost_per_scan,
        SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN COALESCE(api_cost_usd, 0) ELSE 0 END) as cost_today,
        SUM(CASE WHEN DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE) THEN COALESCE(api_cost_usd, 0) ELSE 0 END) as cost_this_month,
        MAX(created_at) as last_scan_date
      FROM homework_scans
      WHERE student_id = :student_id
    `, {
      replacements: { student_id },
      type: sequelize.QueryTypes.SELECT
    });

    console.log("💰 Raw results:", results);
    console.log("💰 Results type:", typeof results, "Is array?", Array.isArray(results));
    console.log("💰 Results length:", results?.length);
    console.log("💰 First element:", results?.[0]);

    const stats = (Array.isArray(results) && results.length > 0) ? results[0] : results || {
      total_scans: 0,
      total_tokens: 0,
      total_cost: 0,
      avg_tokens_per_scan: 0,
      avg_cost_per_scan: 0,
      cost_today: 0,
      cost_this_month: 0,
      last_scan_date: null
    };

    console.log("💰 API usage stats:", stats);

    const response = {
      studentId: student_id,
      totalScans: parseInt(stats.total_scans) || 0,
      totalTokens: parseInt(stats.total_tokens) || 0,
      totalCost: parseFloat(stats.total_cost) || 0,
      avgTokensPerScan: parseFloat(stats.avg_tokens_per_scan) || 0,
      avgCostPerScan: parseFloat(stats.avg_cost_per_scan) || 0,
      costToday: parseFloat(stats.cost_today) || 0,
      costThisMonth: parseFloat(stats.cost_this_month) || 0,
      lastScanDate: stats.last_scan_date,
    };
    
    console.log("💰 Sending response:", response);
    res.json(response);
  } catch (err) {
    console.error("❌ Error fetching API usage:", err);
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({ 
      message: err.message,
      error: err.toString(),
      requiresMigration: false
    });
  }
};

exports.updateAiAgentSettings = async (req, res) => {
  try {
    // Extract values from request body
    const { child_default_ai, parent_default_ai, openai_model } = req.body;

    // Update record where id = 1
    const [updated] = await AiAgentSettings.update(
      {
        child_default_ai,
        parent_default_ai,
        openai_model,
      },
      {
        where: { id: 1 },
      }
    );

    if (updated) {
      const updatedSetting = await AiAgentSettings.findOne({ where: { id: 1 } });
      return res.status(200).json({
        message: "AI Agent Settings updated successfully",
        data: updatedSetting,
      });
    } else {
      return res.status(404).json({ message: "Settings record not found" });
    }
  } catch (err) {
    console.error("Error updating AI Agent Settings:", err);
    res.status(500).json({ message: "Failed to update AI Agent Settings" });
  }
};

exports.getAiAgentSettings = async (req, res) => {
  try {
    // Fetch the settings record (you can also use findAll if multiple entries exist)
    const setting = await AiAgentSettings.findOne({
      where: { id: 1 },
      attributes: {
        exclude: ['created_at', 'updated_at'], // optional, remove if you want timestamps
      },
    });

    if (!setting) {
      return res.status(404).json({ message: "AI Agent Settings not found" });
    }

    res.status(200).json(setting);
  } catch (err) {
    console.error("Error fetching AI Agent Settings:", err);
    res.status(500).json({ message: "Failed to get AI Agent Settings" });
  }
};
exports.updateAgent = async (req, res) => {
  try {
    const { agent_name, entities, grade, state, file_name, api,id } = req.body;
    const updated_by = req.user.id; // user who is updating

    // Find the agent first
    const agent = await AgentPromptSet.findByPk(id);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Update the agent fields
    agent.name = agent_name ?? agent.name;
    agent.description = agent_name ? `Agent prompt set for ${agent_name}` : agent.description;
    agent.entities = entities ?? agent.entities;
    agent.grade = grade ?? agent.grade;
    agent.state = state ?? agent.state;
    agent.file_name = file_name ?? agent.file_name;
    agent.api = api ?? agent.api;
    agent.updated_by = updated_by; // optional: track who updated

    // Save changes
    await agent.save();

    return res.status(200).json({
      message: "Agent updated successfully",
      agent
    });
  } catch (error) {
    console.error("Error updating agent:", error);
    return res.status(500).json({ error: "Failed to update agent" });
  }
};

exports.editUser = async (req, res) => {
 
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      contact_number,
      state,
      role_id,
      avatar,
      username,
      plain_pass,
    } = req.body;

    console.log('📝 Edit User Request:', {
      id,
      body: req.body
    });

    // 1. Find user by ID
    const user = await User.findByPk(id);
    if (!user) {
      console.log('❌ User not found:', id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log('✅ User found:', user.email);

    // 2. Build update fields object
    let updatedFields = {
      first_name,
      last_name,
      email,
      contact_number,
      state,
      role_id,
      avatar,
      username,
      plain_pass,
    };
    
    // Hash password if plain_pass is being updated (using same method as auth.controller.js)
    if (plain_pass) {
      const bcrypt = require('bcryptjs');
      updatedFields.password = await bcrypt.hash(plain_pass, 10);
      console.log('🔐 Hashing password for user');
    }
    
    // Remove undefined values to avoid overwriting with null
    Object.keys(updatedFields).forEach(key => {
      if (updatedFields[key] === undefined) {
        delete updatedFields[key];
      }
    });

    console.log('📋 Fields to update:', updatedFields);

    // 3. Update user
    const updated = await user.update(updatedFields);
    
    console.log('✅ User updated successfully:', {
      id: updated.id,
      email: updated.email,
      first_name: updated.first_name,
      last_name: updated.last_name,
      avatar: updated.avatar
    });

    // Fetch fresh data to ensure we return the latest
    const freshUser = await User.findByPk(id);

    res.json({ message: "User updated successfully", user: freshUser });
  } catch (err) {
    console.error("❌ Error updating user:", err);
    res.status(500).json({ message: err.message });
  }
};

// Admin: Update user credentials (email, username, password)
exports.adminUpdateCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, username, password } = req.body;

    console.log('🔑 Admin updating credentials for user:', id);
    console.log('📥 Received payload:', { email, username, password: password ? '***' : undefined });

    // Find user by ID
    const user = await User.findByPk(id);
    if (!user) {
      console.log('❌ User not found:', id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log('📋 Current user data:', {
      id: user.id,
      email: user.email,
      username: user.username,
      hasPassword: !!user.password,
      plain_pass: user.plain_pass
    });

    const updateFields = {};

    // Update email if provided (and not empty)
    if (email !== undefined && email !== null && email !== '' && email !== user.email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ message: "Email already in use" });
      }
      updateFields.email = email;
      console.log('📧 Updating email to:', email);
    }

    // Update username (portal login) if provided (and not empty)
    if (username !== undefined && username !== null && username !== '') {
      updateFields.username = username;
      console.log('📝 Updating username to:', username);
    }

    // Update password if provided (and not empty) - using same method as auth.controller.js
    if (password && password !== '') {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const bcrypt = require('bcryptjs');
      updateFields.password = await bcrypt.hash(password, 10);
      updateFields.plain_pass = password; // Store plain password for portal access
      console.log('🔐 Updating password and plain_pass to:', password);
    }

    console.log('📤 Fields to update:', Object.keys(updateFields));

    // Update user
    await user.update(updateFields);

    // Fetch fresh data to confirm
    const updatedUser = await User.findByPk(id);

    console.log('✅ Credentials updated successfully:', {
      userId: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      plain_pass: updatedUser.plain_pass,
      hasPassword: !!updatedUser.password
    });

    res.json({ 
      message: "Credentials updated successfully", 
      user: updatedUser 
    });
  } catch (err) {
    console.error("❌ Error updating credentials:", err);
    console.error("❌ Stack trace:", err.stack);
    res.status(500).json({ message: err.message });
  }
};

// Change user password
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    console.log('🔐 Password change request for user:', id);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    // Find user by ID
    const user = await User.findByPk(id);
    if (!user) {
      console.log('❌ User not found:', id);
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Current password is incorrect');
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await user.update({ 
      password: hashedPassword,
      plain_pass: newPassword // Optional: if you want to keep plain text (not recommended for production)
    });

    console.log('✅ Password changed successfully for user:', user.email);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("❌ Error changing password:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.editSubject = async (req, res) => {
  try {
    const { id } = req.params; // Subject ID from URL
    const { subject_name, class_id } = req.body;

    // 1. Find subject by ID
    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // 2. Update subject fields (only fields that exist in the model)
    await subject.update({
      subject_name,
      class_id,
    });

    // 3. Return updated subject with associations
    const updatedSubject = await Subject.findByPk(id, {
      include: [
        {
          model: User,
          as: 'userCreated',
          attributes: { exclude: ['password'] },
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'class_name']
        }
      ]
    });

    res.json({
      message: "Subject updated successfully",
      subject: updatedSubject,
    });
  } catch (err) {
    console.error("Edit subject error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.editClass = async (req, res) => {
  try {
    const { id } = req.params; // Class ID from URL
    const { class_name } = req.body;

    // 1. Find class by ID
    const existingClass = await Class.findByPk(id);
    if (!existingClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    // 2. Update class fields (only fields that exist in the model)
    await existingClass.update({
      class_name,
    });

    // 3. Return updated class with associations
    const updatedClass = await Class.findByPk(id, {
      include: [
        {
          model: User,
          as: 'userCreated',
          attributes: { exclude: ['password'] },
        }
      ]
    });

    res.json({
      message: "Class updated successfully",
      class: updatedClass,
    });
  } catch (err) {
    console.error("Edit class error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.editProduct = async (req, res) => {
  try {
    const { id } = req.params; // Product ID from DB
    const { name, description, price, trial_period_days } = req.body;
    const updated_by = req.user.id;

    // 1️⃣ Find product in your DB
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 2️⃣ Update product in Stripe if name or description changed
    if (product.stripe_product_id) {
      await stripe.products.update(product.stripe_product_id, {
        name,
        description,
      });
    }

    // 3️⃣ Update local database record
    await product.update({
      name,
      description,
      price,
      trial_period_days,
      updated_by,
    });

    // 4️⃣ Return updated product
    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (err) {
    console.error("Edit product error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.editSubscription = async (req, res) => {
  try {
    const { id } = req.params; // Subscription ID from URL
    const { parent_id, stripe_subscription_id, plan_id } = req.body;
    const updated_by = req.user.id;

    // 1️⃣ Find subscription by ID
    const subscription = await Subscription.findByPk(id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // 2️⃣ Update subscription fields
    await subscription.update({
      parent_id,
      stripe_subscription_id,
      plan_id,
      updated_by,
    });

    // 3️⃣ Send success response
    res.json({
      message: "Subscription updated successfully",
      subscription,
    });
  } catch (err) {
    console.error("Edit subscription error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};
exports.editQuiz = async (req, res) => {
  try {
    const { id } = req.params; // Quiz ID from URL
    const {
      title,
      description,
      tags,
      subject,
      grade,
      bundesland,
      difficulty,
      objectives,
      status,
      items, // optional updated quiz items
    } = req.body;

    const updated_by = req.user.id;

    // 1️⃣ Find quiz by ID
    const quiz = await Quiz.findByPk(id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // 2️⃣ Update quiz fields
    await quiz.update({
      title,
      description,
      tags,
      subject,
      grade,
      bundesland,
      difficulty,
      objectives,
      status,
    });

    // 3️⃣ If quiz items are provided, update them
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.id) {
          // Update existing quiz item
          await QuizItem.update(
            {
              question: item.question,
              options: item.options,
              correct_answer: item.correct_answer,
              marks: item.marks,
            },
            { where: { id: item.id, quiz_id: quiz.id } }
          );
        } else {
          // Add new quiz item
          await QuizItem.create({
            quiz_id: quiz.id,
            question: item.question,
            options: item.options,
            correct_answer: item.correct_answer,
            marks: item.marks,
            created_by: updated_by,
          });
        }
      }
    }

    // 4️⃣ Send response
    res.json({
      message: "Quiz updated successfully",
      quiz,
    });
  } catch (err) {
    console.error("Edit quiz error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.editStudent = async (req, res) => {
  try {
    const { id } = req.params; // Student ID from URL
    const {
      first_name,
      last_name,
      email,
      contact_number,
      state,
      status,
      class_id,
      parent_id,
      subjects,
      school,
      grade,
      username,
      plain_pass
    } = req.body;
    const updated_by = req.user.id; // user performing the edit
    
    console.log('📝 Edit Student Request:', {
      id,
      username,
      plain_pass,
      body: req.body
    });
    
    // Note: grade from frontend is just display text from class.class_name
    // Don't use grade to update class_id - only use explicit class_id parameter
    // This prevents trying to save "Grade 983" as an integer
    const finalClassId = class_id;

    // 1. Find student by ID
    const student = await Student.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 2. Update user fields
    const userUpdateFields = {
      first_name,
      last_name,
      email,
      contact_number,
      state,
      status: status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : undefined,
      username,
      plain_pass,
    };
    
    console.log('🔍 Before hash - plain_pass value:', plain_pass);
    console.log('🔍 Before hash - userUpdateFields:', userUpdateFields);
    
    // Hash password if plain_pass is being updated (using same method as auth.controller.js)
    if (plain_pass && plain_pass !== undefined && plain_pass !== null && plain_pass !== '') {
      const bcrypt = require('bcryptjs');
      userUpdateFields.password = await bcrypt.hash(plain_pass, 10);
      console.log('🔐 Hashing password for plain_pass:', plain_pass);
      console.log('✅ Added hashed password to userUpdateFields');
    } else {
      console.log('⚠️ Skipping hash - plain_pass is empty or undefined');
    }
    
    // Remove undefined values to avoid overwriting with null
    Object.keys(userUpdateFields).forEach(key => {
      if (userUpdateFields[key] === undefined) {
        delete userUpdateFields[key];
      }
    });
    
    console.log('📤 Final userUpdateFields to update:', Object.keys(userUpdateFields));

    await student.user.update(userUpdateFields);
    
    console.log('✅ Student user updated:', {
      username: student.user.username,
      plain_pass: student.user.plain_pass
    });

    // 3. Update student fields
    const studentUpdateFields = {};
    if (finalClassId !== undefined) studentUpdateFields.class_id = finalClassId;
    if (parent_id !== undefined) studentUpdateFields.parent_id = parent_id;
    studentUpdateFields.updated_by = updated_by;
    
    // Add student settings (profile, interests, buddy)
    // Always set these fields to ensure JSONB fields are properly updated
    if (req.body.profile !== undefined) {
      studentUpdateFields.profile = req.body.profile;
      console.log('📝 Profile to save:', req.body.profile);
    }
    if (req.body.interests !== undefined) {
      studentUpdateFields.interests = req.body.interests;
      console.log('📝 Interests to save:', req.body.interests);
    }
    if (req.body.buddy !== undefined) {
      studentUpdateFields.buddy = req.body.buddy;
      console.log('📝 Buddy to save:', req.body.buddy);
    }
    
    console.log('📝 All student settings to update:', studentUpdateFields);
    
    // Note: grade is derived from class_id (stored in classes.class_name)
    // school is display-only (computed from class relationship)
    
    // Only update student fields if there are fields to update
    if (Object.keys(studentUpdateFields).length > 0) {
      // Force update of JSONB fields by explicitly setting them
      const updateOptions = { 
        fields: Object.keys(studentUpdateFields),
        returning: true,
        silent: false
      };
      
      console.log('🔄 Updating with fields:', Object.keys(studentUpdateFields));
      
      await student.update(studentUpdateFields, updateOptions);
      
      // Reload the student to get fresh data
      await student.reload();
      
      console.log('✅ Student fields updated:', {
        profile: student.profile,
        interests: student.interests,
        buddy: student.buddy
      });
    }

    // 4. If subjects are provided, update them
    if (subjects && Array.isArray(subjects)) {
      // Delete existing student-subject relationships
      await StudentSubjects.destroy({ where: { student_id: id } });
      
      // Create new student-subject relationships
      const subjectMappings = subjects.map(subject_id => ({
        student_id: id,
        subject_id: subject_id,
        created_by: updated_by
      }));
      
      await StudentSubjects.bulkCreate(subjectMappings);
    }

    // 5. Return updated student with associations
    const updatedStudent = await Student.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] },
        },
        {
          model: Parent,
          as: 'parent',
          include: [
            {
              model: User,
              as: 'user',
              attributes: { exclude: ['password'] }
            }
          ]
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'class_name']
        },
        {
          model: StudentSubjects,
          as: 'subject',
          attributes: ['id'],
          include: [
            {
              model: Subject,
              as: 'subject',
              attributes: ['id', 'subject_name']
            }
          ]
        }
      ]
    });

    res.json({ message: "Student updated successfully", student: updatedStudent });
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.editTeacher = async (req, res) => {
  try {
    const { id } = req.params; // Teacher ID from URL
    const {
      first_name,
      last_name,
      email,
      contact_number,
      state,
      status,
      class_id,
      username,
      plain_pass
    } = req.body;
    const updated_by = req.user.id; // user performing the edit

    // 1. Find teacher by ID
    const teacher = await Teacher.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // 2. Update user fields
    const userUpdateFields = {
      first_name,
      last_name,
      email,
      contact_number,
      state,
      status: status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : undefined,
      username,
      plain_pass,
    };
    
    // Hash password if plain_pass is being updated (using same method as auth.controller.js)
    if (plain_pass) {
      const bcrypt = require('bcryptjs');
      userUpdateFields.password = await bcrypt.hash(plain_pass, 10);
      console.log('🔐 Hashing password for teacher');
    }

    await teacher.user.update(userUpdateFields);

    // 3. Update teacher fields
    const teacherUpdateFields = {
      class_id,
      updated_by,
    };

    await teacher.update(teacherUpdateFields);

    // 4. Return updated teacher with associations
    const updatedTeacher = await Teacher.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] },
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'class_name']
        }
      ]
    });

    res.json({ message: "Teacher updated successfully", teacher: updatedTeacher });
  } catch (err) {
    console.error("Error updating teacher:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.editParent = async (req, res) => {
  try {
    const { id } = req.params; // Parent ID from URL
    const {
      first_name,
      last_name,
      email,
      contact_number,
      state,
      status,
      is_payer,
      username,
      plain_pass
    } = req.body;
    const updated_by = req.user.id; // user performing the edit

    // 1. Find parent by ID
    const parent = await Parent.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });
    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    // 2. Update user fields
    const userUpdateFields = {
      first_name,
      last_name,
      email,
      contact_number,
      state,
      status: status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : undefined,
      username,
      plain_pass,
    };
    
    // Hash password if plain_pass is being updated (using same method as auth.controller.js)
    if (plain_pass) {
      const bcrypt = require('bcryptjs');
      userUpdateFields.password = await bcrypt.hash(plain_pass, 10);
      console.log('🔐 Hashing password for parent');
    }

    await parent.user.update(userUpdateFields);

    // 3. Update parent fields
    const parentUpdateFields = {
      is_payer,
      updated_by,
    };

    await parent.update(parentUpdateFields);

    // 4. Return updated parent with associations
    const updatedParent = await Parent.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] },
        },
        {
          model: Student,
          as: 'student',
          include: [
            {
              model: User,
              as: 'user',
              attributes: { exclude: ['password'] }
            }
          ]
        }
      ]
    });

    res.json({ message: "Parent updated successfully", parent: updatedParent });
  } catch (err) {
    console.error("Error updating parent:", err);
    res.status(500).json({ message: err.message });
  }
};

// Update student status
exports.updateStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const student = await Student.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const capitalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : undefined;
    
    await student.user.update({ status: capitalizedStatus });

    res.json({ message: "Student status updated successfully" });
  } catch (err) {
    console.error("Error updating student status:", err);
    res.status(500).json({ message: err.message });
  }
};

// Update teacher status
exports.updateTeacherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const teacher = await Teacher.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const capitalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : undefined;
    
    await teacher.user.update({ status: capitalizedStatus });

    res.json({ message: "Teacher status updated successfully" });
  } catch (err) {
    console.error("Error updating teacher status:", err);
    res.status(500).json({ message: err.message });
  }
};

// Update parent status
exports.updateParentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const parent = await Parent.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    const capitalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : undefined;
    
    await parent.user.update({ status: capitalizedStatus });

    res.json({ message: "Parent status updated successfully" });
  } catch (err) {
    console.error("Error updating parent status:", err);
    res.status(500).json({ message: err.message });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`🗑️ Attempting to delete student ID: ${id}`);
    const student = await Student.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!student) {
      console.log(`❌ Student not found: ${id}`);
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log(`✅ Found student: ${id}, user_id: ${student.user_id}`);

    // Delete the student record
    await student.destroy();
    console.log(`✅ Deleted student record ${id}`);

    // Optionally delete the associated user
    if (student.user_id) {
      await User.destroy({ where: { id: student.user_id } });
      console.log(`✅ Deleted associated user ${student.user_id}`);
    }

    console.log(`✅ Successfully deleted student ${id}`);
    return res.status(200).json({ message: 'Student deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting student:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Delete teacher
exports.deleteTeacher = async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`🗑️ Attempting to delete teacher ID: ${id}`);
    const teacher = await Teacher.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!teacher) {
      console.log(`❌ Teacher not found: ${id}`);
      return res.status(404).json({ message: 'Teacher not found' });
    }

    console.log(`✅ Found teacher: ${id}, user_id: ${teacher.user_id}`);

    // Delete the teacher record
    await teacher.destroy();
    console.log(`✅ Deleted teacher record ${id}`);

    // Optionally delete the associated user
    if (teacher.user_id) {
      await User.destroy({ where: { id: teacher.user_id } });
      console.log(`✅ Deleted associated user ${teacher.user_id}`);
    }

    console.log(`✅ Successfully deleted teacher ${id}`);
    return res.status(200).json({ message: 'Teacher deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting teacher:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Delete parent
exports.deleteParent = async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`🗑️ Attempting to delete parent ID: ${id}`);
    const parent = await Parent.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!parent) {
      console.log(`❌ Parent not found: ${id}`);
      return res.status(404).json({ message: 'Parent not found' });
    }

    console.log(`✅ Found parent: ${id}, user_id: ${parent.user_id}`);

    // Delete the parent record
    await parent.destroy();
    console.log(`✅ Deleted parent record ${id}`);

    // Optionally delete the associated user
    if (parent.user_id) {
      await User.destroy({ where: { id: parent.user_id } });
      console.log(`✅ Deleted associated user ${parent.user_id}`);
    }

    console.log(`✅ Successfully deleted parent ${id}`);
    return res.status(200).json({ message: 'Parent deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting parent:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};