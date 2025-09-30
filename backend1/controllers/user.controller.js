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


exports.adduser = async (req, res) => {
  try {
    const { first_name, last_name, email,contact_number, role_id, state, class_id,parent_id, subjects } = req.body;


    // 2. Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const created_by = req.user.id;
     const password = await bcrypt.hash("testpass1234", 10);
    const newUser = await User.create({
      role_id,
      first_name,
      last_name,
      email,
      contact_number,
      state,
      password
    });
    if(role_id == 1)
    {
       const newStudent = await Student.create({
      user_id:newUser.id,
      class_id:class_id,
      parent_id: parent_id || null,
      created_by,
    });

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

    res.status(201).json({ message: "User registered", user: userData });
  } catch (err) {
    console.error("Adding user error:", err);
    res.status(500).json({ message: "Server error" });
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
          as: 'invoiceuser'
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

exports.deleteParent = async (req, res) => {
  const { id } = req.params;

  try {
    const parent = await Parent.findByPk(id);

    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }

    await parent.destroy();

    return res.status(200).json({ message: 'Parent deleted successfully' });

  } catch (error) {
    console.error('Error deleting parent:', error);
    return res.status(500).json({ message: 'Internal server error' });
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
          as: 'parent', // Parent → Student
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
          as: 'invoiceuser', // Parent → Student
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
          as: 'invoiceuser', // Parent → Student
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
    const newRole = await Role.create({
   name:role_name, 
   permissions,
    created_by,
    });

    res.status(201).json({ message: "New role created", role: newRole });
  } catch (err) {
    console.error("New role error:", err);
    res.status(500).json({ message: "Server error", error:err });
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
      include: [{ model: QuizItem, as: 'items' }]
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
    await QuizItem.destroy({ where: { quiz_id: id }, transaction: t });

    // Delete quiz
    const deleted = await Quiz.destroy({ where: { id }, transaction: t });


    if (!deleted) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    return res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    await t.rollback();
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


  