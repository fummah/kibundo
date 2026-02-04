const db = require("../models");
const { Student, User, HomeworkScan } = db;
const { Op } = require("sequelize");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require("../services/email.service");

// ============================================
// BETA USER MANAGEMENT
// ============================================

exports.getBetaUsers = async (req, res) => {
  try {
    const betaUsers = await db.user.findAll({
      where: { is_beta: true },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: db.role,
          as: 'role'
        },
        {
          model: db.user,
          as: 'betaApprover',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['beta_requested_at', 'DESC']]
    });
    
    res.json(betaUsers);
  } catch (error) {
    console.error('Error fetching beta users:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.approveBetaUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    
    const user = await db.user.findOne({
      where: { id, is_beta: true }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Beta user not found' });
    }
    
    if (user.beta_status === 'approved') {
      return res.status(400).json({ message: 'User is already approved' });
    }
    
    // Update user with approval
    await user.update({
      beta_status: 'approved',
      isActive: true,
      beta_approved_at: new Date(),
      beta_approved_by: adminId
    });
    
    // Send approval email
    const userData = { ...user.toJSON() };
    delete userData.password;

    let frontendBase = process.env.FRONTEND_URL;
    if (!frontendBase) {
      const origin = req.get('origin') || req.get('referer');
      if (origin) {
        try {
          const url = new URL(origin);
          frontendBase = `${url.protocol}//${url.host}`;
        } catch {
          // ignore
        }
      }
    }
    if (!frontendBase) {
      const xfProto = req.get('x-forwarded-proto');
      const xfHost = req.get('x-forwarded-host');
      if (xfProto && xfHost) {
        frontendBase = `${xfProto}://${xfHost}`;
      }
    }
    if (frontendBase) {
      userData.frontendBase = String(frontendBase).replace(/\/+$/, "");
    }
    
    emailService.sendBetaApprovalEmail(userData)
      .then((result) => {
        if (result.success) {
          console.log("✅ Beta approval email sent successfully to:", userData.email, "Message ID:", result.messageId);
        } else {
          console.error("❌ Failed to send beta approval email to:", userData.email, "Error:", result.error);
        }
      })
      .catch((emailError) => {
        console.error("❌ Exception sending beta approval email to:", userData.email, "Error:", emailError);
      });
    
    res.json({
      message: 'Beta user approved successfully',
      user: userData
    });
  } catch (error) {
    console.error('Error approving beta user:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.rejectBetaUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Optional rejection reason
    
    const user = await db.user.findOne({
      where: { id, is_beta: true }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Beta user not found' });
    }
    
    if (user.beta_status === 'rejected') {
      return res.status(400).json({ message: 'User is already rejected' });
    }
    
    // Update user with rejection
    await user.update({
      beta_status: 'rejected',
      isActive: false
    });
    
    // Send rejection email (optional)
    const userData = { ...user.toJSON() };
    delete userData.password;
    
    if (reason) {
      emailService.sendBetaRejectionEmail({ ...userData, rejection_reason: reason })
        .then((result) => {
          if (result.success) {
            console.log("✅ Beta rejection email sent successfully to:", userData.email);
          } else {
            console.error("❌ Failed to send beta rejection email to:", userData.email, "Error:", result.error);
          }
        })
        .catch((emailError) => {
          console.error("❌ Exception sending beta rejection email to:", userData.email, "Error:", emailError);
        });
    }
    
    res.json({
      message: 'Beta user rejected successfully',
      user: userData
    });
  } catch (error) {
    console.error('Error rejecting beta user:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getBetaStats = async (req, res) => {
  try {
    const result = await db.user.findOne({
      where: { is_beta: true },
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total'],
        [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.literal("CASE WHEN beta_status = 'pending' THEN 1 ELSE 0 END")), 0), 'pending'],
        [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.literal("CASE WHEN beta_status = 'approved' THEN 1 ELSE 0 END")), 0), 'approved'],
        [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.literal("CASE WHEN beta_status = 'rejected' THEN 1 ELSE 0 END")), 0), 'rejected'],
      ],
      raw: true,
    });

    const total = Number(result?.total || 0);
    const pending = Number(result?.pending || 0);
    const approved = Number(result?.approved || 0);
    const rejected = Number(result?.rejected || 0);

    res.json({
      total_beta_users: Number.isFinite(total) ? total : 0,
      pending_approval: Number.isFinite(pending) ? pending : 0,
      approved: Number.isFinite(approved) ? approved : 0,
      rejected: Number.isFinite(rejected) ? rejected : 0
    });
  } catch (error) {
    console.error('Error fetching beta stats:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// ============================================
// USER MANAGEMENT
// ============================================

exports.getAllUsers = async (req, res) => {
  try {
    const users = await db.user.findAll({
      attributes: { exclude: ['password'] },
      include: [
        {
          model: db.role,
          as: 'role'
        }
      ]
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.id; // From verifyToken middleware
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in token' });
    }
    
    const user = await db.user.findOne({
      where: { id: userId },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: db.role,
          as: 'role'
        },
        {
          model: db.parent,
          as: 'parent'
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.debugUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.user.findOne({
      where: { id },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: db.role,
          as: 'role'
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error debugging user:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.adduser = async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");
    const { first_name, last_name, email, contact_number, role_id, state, class_id, parent_id, subjects, password: providedPassword } = req.body;

    // 2. Check if user exists
    const existingUser = await db.user.findOne({ where: { email } });
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

    // For parents (role_id == 2), password is set during signup, not by admin
    // For other roles, auto-generate password if not provided
    let temppass;
    let password;
    
    if (role_id == 2) {
      // Parent: If password is provided (admin setting it), use it. Otherwise, generate a temporary one.
      // In practice, parents should sign up themselves, so password should be set during signup.
      // For admin-created parent accounts, we'll generate a temporary password that parent can reset.
      if (providedPassword && providedPassword.trim() !== '') {
        temppass = providedPassword;
        password = await bcrypt.hash(providedPassword, 10);
      } else {
        // Generate temporary password for admin-created accounts (parent should reset it)
        temppass = generateRandomPassword();
        password = await bcrypt.hash(temppass, 10);
      }
    } else {
      // Other roles: auto-generate if not provided
      temppass = providedPassword || generateRandomPassword();
      password = await bcrypt.hash(temppass, 10);
    }

    const newUser = await db.user.create({
      role_id,
      first_name,
      last_name,
      email,
      contact_number,
      state,
      password,
    });

    if (role_id == 1) {
      const newStudent = await db.student.create({
        user_id: newUser.id,
        class_id: class_id,
        parent_id: parent_id || null,
      created_by,
    });

      // ✅ Generate username using student ID instead of user ID
  const username =
    (first_name.substring(0, 2) + last_name.substring(0, 1)).toLowerCase() +
    newStudent.id;

  // ✅ Update the username field in users table
      await db.user.update(
        { username, plain_pass: temppass },
    { where: { id: newUser.id } }
  );

  // Optionally, include username in response
  newUser.username = username;

       if (subjects && Array.isArray(subjects) && subjects.length > 0) {
        // Ensure all subject IDs are valid numbers
        const validSubjectIds = subjects
          .map(id => Number(id))
          .filter(id => !isNaN(id) && id > 0);
        
        if (validSubjectIds.length > 0) {
          const subjectMappings = validSubjectIds.map(subject_id => ({
            student_id: newStudent.id,
            subject_id: subject_id,
            created_by: String(created_by)
          }));

          try {
            const created = await db.student_subjects.bulkCreate(subjectMappings);
            console.log(`✅ [adduser] Created ${created.length} student_subjects entries for student ${newStudent.id}:`, validSubjectIds);
          } catch (subjectError) {
            console.error(`❌ [adduser] Error creating student_subjects:`, subjectError);
            // Don't fail the entire user creation if subjects fail
          }
        } else {
          console.warn(`⚠️ [adduser] No valid subject IDs provided for student ${newStudent.id}. Subjects array:`, subjects);
        }
      } else {
        console.log(`ℹ️ [adduser] No subjects provided for student ${newStudent.id}`);
      }
    } else if (role_id == 2) {
      const newParent = await db.parent.create({
        user_id: newUser.id,
        created_by,
      });
      
      // For parents created by admin: email is the portal login (username)
      // Password is set by parent during signup, or temporary password if admin-created
      // Set username to email for portal login
      await db.user.update(
        { 
          username: email, // Email is the portal login for parents
          plain_pass: temppass // Store temporary password (parent should reset during signup)
        },
        { where: { id: newUser.id } }
      );
    } else if (role_id == 3) {
      const newTeacher = await db.teacher.create({
        user_id: newUser.id,
        class_id: class_id,
      created_by,
    });
    }
       
  const userData = { ...newUser.toJSON() };
    delete userData.password;
    // Only include plain password in response for non-parent roles (for security)
    // For parents, password is set by admin and should not be returned
    if (role_id != 2) {
      userData.password = temppass;
    }

    res.status(201).json({ message: "User registered", user: userData });
  } catch (err) {
    console.error("Adding user error:", err);
    res.status(500).json({ message: "Server error" });
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
      status,
    } = req.body;

    console.log('📝 [editUser] Updating user ID:', id);

    // Find user by ID
    const user = await db.user.findByPk(id);
    if (!user) {
      console.log('❌ [editUser] User not found:', id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log('✅ [editUser] User found:', user.email);

    // Build update fields object
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
      status: status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : undefined,
    };
    
    // Hash password if plain_pass is being updated
    if (plain_pass && plain_pass !== undefined && plain_pass !== null && plain_pass !== '') {
      const bcrypt = require('bcryptjs');
      updatedFields.password = await bcrypt.hash(plain_pass, 10);
      console.log('🔐 [editUser] Hashing password for user');
    }
    
    // Fix: Handle username updates - if username is being set to empty string, set to null instead
    // This prevents login issues when username is cleared
    if (updatedFields.username === '') {
      updatedFields.username = null;
      console.log('📝 [editUser] Converting empty username to null');
    }
    
    // Remove undefined values to avoid overwriting with null
    Object.keys(updatedFields).forEach(key => {
      if (updatedFields[key] === undefined) {
        delete updatedFields[key];
      }
    });

    console.log('📋 [editUser] Fields to update:', Object.keys(updatedFields));

    // Update user
    await user.update(updatedFields);
    
    console.log('✅ [editUser] User updated successfully:', {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    });

    // Fetch fresh data to ensure we return the latest
    const freshUser = await db.user.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: db.role,
          as: 'role',
          attributes: { exclude: [] }
        }
      ]
    });

    res.json({ message: "User updated successfully", user: freshUser });
  } catch (err) {
    console.error("❌ [editUser] Error updating user:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    console.log('🔐 [changePassword] Password change request for user:', id);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    // Find user by ID
    const user = await db.user.findByPk(id);
    if (!user) {
      console.log('❌ [changePassword] User not found:', id);
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ [changePassword] Current password is incorrect');
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await user.update({ 
      password: hashedPassword,
      plain_pass: newPassword // Store plain password for portal access
    });

    console.log('✅ [changePassword] Password changed successfully for user:', user.email);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("❌ [changePassword] Error changing password:", err);
    res.status(500).json({ message: err.message });
  }
};

// Delete user (cascade delete related entities)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ [deleteUser] Attempting to delete user ID: ${id}`);

    // Find user and check for related entities
    const user = await db.user.findByPk(id, {
      include: [
        { model: db.student, as: 'student' },
        { model: db.teacher, as: 'teacher' },
        { model: db.parent, as: 'parent' }
      ]
    });

    if (!user) {
      console.log(`❌ [deleteUser] User not found: ${id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`✅ [deleteUser] Found user: ${id}, email: ${user.email}`);

    // Check what role this user has and handle accordingly
    const role_id = user.role_id;
    
    // Delete related entities first
    if (user.student && user.student.length > 0) {
      const student = user.student[0];
      console.log(`🗑️ [deleteUser] Deleting associated student record ${student.id}`);
      // Delete student-subject relationships
      await db.student_subjects.destroy({ where: { student_id: student.id } });
      await student.destroy();
    }

    if (user.teacher && user.teacher.length > 0) {
      const teacher = user.teacher[0];
      console.log(`🗑️ [deleteUser] Deleting associated teacher record ${teacher.id}`);
      await teacher.destroy();
    }

    if (user.parent && user.parent.length > 0) {
      const parent = user.parent[0];
      console.log(`🗑️ [deleteUser] Deleting associated parent record ${parent.id}`);
      // Check if parent has children
      const children = await db.student.findAll({ where: { parent_id: parent.id } });
      if (children.length > 0) {
        console.log(`⚠️ [deleteUser] Parent has ${children.length} children. Children will be orphaned.`);
      }
      await parent.destroy();
    }

    // Finally, delete the user
    await user.destroy();
    console.log(`✅ [deleteUser] Successfully deleted user ${id}`);

    return res.status(200).json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('❌ [deleteUser] Error deleting user:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.adminUpdateCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    await db.user.update(updateData, { where: { id } });
    res.json({ message: 'Credentials updated successfully' });
  } catch (error) {
    console.error('Error updating credentials:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// ============================================
// PRODUCT MANAGEMENT
// ============================================

exports.getAllProducts = async (req, res) => {
  try {
    console.log('🛒 [getAllProducts] Fetching active products for subscription selection...');
    // Filter to only return active products (per client feedback)
    const products = await db.product.findAll({
      order: [['id', 'ASC']],
      where: {
        active: true  // Only show active products
      }
    });
    
    // Sort by metadata.sort_order after fetching (simpler approach)
    products.sort((a, b) => {
      const aMeta = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : (a.metadata || {});
      const bMeta = typeof b.metadata === 'string' ? JSON.parse(b.metadata) : (b.metadata || {});
      const aOrder = aMeta.sort_order ?? 999;
      const bOrder = bMeta.sort_order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.id - b.id;
    });
    
    console.log(`✅ [getAllProducts] Found ${products.length} active products`);
    if (products.length > 0) {
      console.log('📦 [getAllProducts] Products:', products.map(p => {
        const prod = p.toJSON();
        const metadata = typeof prod.metadata === 'string' ? JSON.parse(prod.metadata) : (prod.metadata || {});
        return { 
          id: prod.id, 
          name: prod.name, 
          active: prod.active, 
          price: prod.price,
          sort_order: metadata.sort_order || 999,
          display_name: metadata.display_name || prod.name
        };
      }));
    } else {
      console.warn('⚠️ [getAllProducts] No active products found. Checking all products...');
      const allProducts = await db.product.findAll({ order: [['id', 'ASC']] });
      console.log(`ℹ️ [getAllProducts] Total products in database: ${allProducts.length}`);
      if (allProducts.length > 0) {
        console.log('📦 [getAllProducts] All products:', allProducts.map(p => ({ id: p.id, name: p.name, active: p.active })));
        console.log('💡 [getAllProducts] Tip: Make sure products have active=true to appear in subscription selection');
      }
    }
    
    // Ensure metadata is an object
    const formattedProducts = products.map(p => {
      const product = p.toJSON();
      if (typeof product.metadata === 'string') {
        try {
          product.metadata = JSON.parse(product.metadata);
        } catch (e) {
          console.warn(`⚠️ [getAllProducts] Failed to parse metadata for product ${product.id}:`, e.message);
          product.metadata = {};
        }
      } else if (!product.metadata) {
        product.metadata = {};
      }
      return product;
    });
    
    console.log(`✅ [getAllProducts] Returning ${formattedProducts.length} formatted products for parent to choose from`);
    res.json(formattedProducts);
  } catch (error) {
    console.error('❌ [getAllProducts] Error fetching products:', error);
    console.error('❌ [getAllProducts] Error stack:', error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.product.findOne({ where: { id } });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const productData = product.toJSON();
    if (typeof productData.metadata === 'string') {
      try {
        productData.metadata = JSON.parse(productData.metadata);
      } catch (e) {
        productData.metadata = {};
      }
    }
    
    res.json(productData);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.addproduct = async (req, res) => {
  try {
    const productData = req.body;
    
    // Get the current user ID from the authenticated request
    const created_by = req.user?.id ? String(req.user.id) : null;
    console.log('🛒 [addproduct] Creating product:', { 
      name: productData.name, 
      price: productData.price,
      created_by: created_by 
    });
    
    // Parse metadata if it's a string
    let metadata = productData.metadata || {};
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        console.warn('⚠️ [addproduct] Failed to parse metadata, using empty object');
        metadata = {};
      }
    }
    
    // Validate Stripe API key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ [addproduct] STRIPE_SECRET_KEY is not configured in environment variables');
      return res.status(500).json({ 
        message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.',
        error: 'STRIPE_SECRET_KEY missing'
      });
    }
    
    // Create product in Stripe first
    let stripeProductId = null;
    try {
      console.log('💳 [addproduct] Creating Stripe product...');
      const stripeProduct = await stripe.products.create({
        name: productData.name || 'Subscription Product',
        description: productData.description || '',
        active: productData.active !== undefined ? productData.active : true,
        metadata: {
          ...metadata,
          db_product_id: 'pending' // Will be updated after DB creation
        }
      });
      
      stripeProductId = stripeProduct.id;
      console.log('✅ [addproduct] Stripe product created:', stripeProductId);
    } catch (stripeError) {
      console.error('❌ [addproduct] Failed to create Stripe product:', stripeError.message);
      console.error('❌ [addproduct] Stripe error details:', {
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message
      });
      // Don't continue if Stripe fails - return error
      return res.status(500).json({ 
        message: 'Failed to create product in Stripe. Please check your Stripe configuration.',
        error: stripeError.message,
        stripeError: {
          type: stripeError.type,
          code: stripeError.code
        }
      });
    }
    
    // Create product in database with Stripe ID and created_by
    const dbProductData = {
      ...productData,
      stripe_product_id: stripeProductId,
      created_by: created_by,
      metadata: metadata
    };
    
    // Remove any undefined values that might cause issues
    Object.keys(dbProductData).forEach(key => {
      if (dbProductData[key] === undefined) {
        delete dbProductData[key];
      }
    });
    
    console.log('💾 [addproduct] Saving to database:', {
      name: dbProductData.name,
      stripe_product_id: dbProductData.stripe_product_id,
      created_by: dbProductData.created_by
    });
    
    const product = await db.product.create(dbProductData);
    console.log('✅ [addproduct] Database product created:', product.id, 'with stripe_product_id:', product.stripe_product_id);
    
    // Update Stripe product metadata with the database ID
    if (stripeProductId && product.id) {
      try {
        await stripe.products.update(stripeProductId, {
          metadata: {
            ...metadata,
            db_product_id: String(product.id)
          }
        });
        console.log('✅ [addproduct] Updated Stripe product metadata with DB ID');
      } catch (stripeError) {
        console.warn('⚠️ [addproduct] Failed to update Stripe product metadata:', stripeError.message);
        // Non-critical, continue
      }
    }
    
    // Return the created product with parsed metadata
    const productResponse = product.toJSON();
    if (typeof productResponse.metadata === 'string') {
      try {
        productResponse.metadata = JSON.parse(productResponse.metadata);
      } catch (e) {
        productResponse.metadata = {};
      }
    }
    
    console.log('✅ [addproduct] Product creation complete:', {
      id: productResponse.id,
      name: productResponse.name,
      stripe_product_id: productResponse.stripe_product_id,
      created_by: productResponse.created_by
    });
    
    res.status(201).json(productResponse);
  } catch (error) {
    console.error('❌ [addproduct] Error creating product:', error);
    console.error('❌ [addproduct] Error stack:', error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.editProduct = async (req, res) => {
  try {
  const { id } = req.params;
    const updateData = req.body;
    
    const product = await db.product.findOne({ where: { id } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update Stripe product if stripe_product_id exists
    if (product.stripe_product_id && product.stripe_product_id.startsWith('prod_')) {
      try {
        await stripe.products.update(product.stripe_product_id, {
          name: updateData.name,
          description: updateData.description,
          active: updateData.active !== undefined ? updateData.active : true
        });
      } catch (stripeError) {
        console.warn('Stripe product update failed:', stripeError.message);
      }
    }
    
    // Merge metadata if provided
    if (updateData.metadata) {
      const existingMeta = typeof product.metadata === 'string' 
        ? JSON.parse(product.metadata) 
        : (product.metadata || {});
      updateData.metadata = { ...existingMeta, ...updateData.metadata };
    }
    
    // Update database
    await db.product.update(updateData, { where: { id } });
    const updatedProduct = await db.product.findOne({ where: { id } });
    
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
  const { id } = req.params;
    const deleted = await db.product.destroy({ where: { id } });
    
    if (deleted === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

exports.getAllSubscriptions = async (req, res) => {
  try {
    const { parent_id } = req.query;
    const where = {};
    
    if (parent_id) {
      where.parent_id = parent_id;
    }
    
    const subscriptions = await db.subscription.findAll({
      where,
          include: [
            {
          model: db.product,
              as: 'product'
        },
        {
          model: db.parent,
          as: 'parent',
         include: [
        {
              model: db.user,
          as: 'user',
              attributes: { exclude: ['password'] }
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    // Auto-sync incomplete subscriptions
    const syncPromises = subscriptions
      .filter(sub => sub.status === 'incomplete' && sub.stripe_subscription_id && sub.stripe_subscription_id.startsWith('sub_'))
      .map(async (sub) => {
        try {
          const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
          const latestInvoice = stripeSub.latest_invoice;
          
          let normalizedStatus = stripeSub.status;
          if (latestInvoice) {
            const invoice = typeof latestInvoice === 'string' 
              ? await stripe.invoices.retrieve(latestInvoice)
              : latestInvoice;
            
            if (invoice.paid) {
              normalizedStatus = stripeSub.status === 'trialing' ? 'trialing' : 'active';
            }
          }
          
          if (normalizedStatus !== 'incomplete' && normalizedStatus !== 'incomplete_expired') {
            await db.subscription.update(
              {
                status: normalizedStatus,
                current_period_end: new Date(stripeSub.current_period_end * 1000),
                raw: { subscription: stripeSub, metadata: stripeSub.metadata }
              },
              { where: { id: sub.id } }
            );
          }
  } catch (err) {
          console.warn(`Failed to sync subscription ${sub.id}:`, err.message);
        }
      });
    
    await Promise.all(syncPromises);
    
    // Re-fetch after sync
    const updatedSubscriptions = await db.subscription.findAll({
      where,
      include: [
        {
          model: db.product,
          as: 'product'
        },
          {
          model: db.parent,
          as: 'parent',
          include: [
            {
              model: db.user,
              as: 'user', 
              attributes: { exclude: ['password'] }
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    res.json(updatedSubscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await db.subscription.findOne({
      where: { id },
       include: [
        {
          model: db.product,
          as: 'product'
        },
        {
          model: db.parent,
          as: 'parent',
          include: [
            {
              model: db.user,
              as: 'user',
              attributes: { exclude: ['password'] }
            }
          ]
        }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.json({ data: subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.addsubscription = async (req, res) => {
  try {
    const subscriptionData = req.body;
    console.log('📝 [addsubscription] Creating subscription with data:', subscriptionData);
    const subscription = await db.subscription.create(subscriptionData);
    
    console.log('✅ [addsubscription] Subscription created with ID:', subscription.id);
    
    // 🔥 CRITICAL: Re-fetch subscription with all associations to match getAllSubscriptions format
    // This ensures newly created subscriptions appear in the list with the same structure
    const subscriptionWithAssociations = await db.subscription.findOne({
      where: { id: subscription.id },
      include: [
        {
          model: db.product,
          as: 'product'
        },
        {
          model: db.parent,
          as: 'parent',
          include: [
            {
              model: db.user,
              as: 'user',
              attributes: { exclude: ['password'] }
            }
          ]
        }
      ]
    });
    
    if (!subscriptionWithAssociations) {
      console.error('❌ [addsubscription] Failed to fetch created subscription with associations');
      return res.status(500).json({ message: 'Subscription created but failed to fetch with associations' });
    }
    
    console.log('✅ [addsubscription] Returning subscription with associations (ID:', subscriptionWithAssociations.id, ')');
    res.status(201).json(subscriptionWithAssociations);
  } catch (error) {
    console.error('❌ [addsubscription] Error creating subscription:', error);
    console.error('❌ [addsubscription] Error stack:', error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.editSubscription = async (req, res) => {
  try {
  const { id } = req.params;
    const updateData = req.body;
    
    const [updated] = await db.subscription.update(updateData, {
      where: { id },
      returning: true
    });
    
    if (updated === 0) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    const subscription = await db.subscription.findOne({ where: { id } });
    res.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
  const { id } = req.params;
    const deleted = await db.subscription.destroy({ where: { id } });
    
    if (deleted === 0) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// ============================================
// INVOICE MANAGEMENT
// ============================================

exports.getAllInvoices = async (req, res) => {
  try {
    const { parent_id } = req.query;
    const where = {};
    
    console.log(`🔍 getAllInvoices called with parent_id: ${parent_id} (type: ${typeof parent_id})`);
    
    if (parent_id) {
      // Ensure parent_id is parsed as integer
      const parsedParentId = parseInt(parent_id, 10);
      if (!isNaN(parsedParentId)) {
        where.parent_id = parsedParentId;
        console.log(`✅ Filtering invoices by parent_id: ${parsedParentId}`);
      } else {
        console.warn(`⚠️ Invalid parent_id format: ${parent_id}`);
      }
    } else {
      console.log(`ℹ️ No parent_id provided, fetching all invoices`);
    }
    
    const invoices = await db.invoice.findAll({
      where,
          include: [
            {
          model: db.parent,
          as: 'parent',
          include: [
            {
              model: db.user,
              as: 'user',
              attributes: { exclude: ['password'] }
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    console.log(`📦 Found ${invoices.length} invoices`);
    if (invoices.length > 0) {
      console.log(`📄 First invoice sample:`, {
        id: invoices[0].id,
        parent_id: invoices[0].parent_id,
        status: invoices[0].status,
        total_cents: invoices[0].total_cents,
        created_at: invoices[0].created_at
      });
    }
    
    res.json(invoices);
  } catch (error) {
    console.error('❌ Error fetching invoices:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await db.invoice.findOne({
      where: { id },      
          include: [
            {
          model: db.parent,
          as: 'parent'
            }
          ]
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.addinvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    const invoice = await db.invoice.create(invoiceData);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
  const { id } = req.params;
    const deleted = await db.invoice.destroy({ where: { id } });

    if (deleted === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// ============================================
// COUPON MANAGEMENT
// ============================================

exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await db.coupon.findAll({
      order: [['id', 'DESC']]
    });
    res.json(coupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getCouponById = async (req, res) => {
  try {
  const { id } = req.params;
    const coupon = await db.coupon.findOne({ where: { id } });

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json(coupon);
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.addcoupon = async (req, res) => {
  try {
    const couponData = req.body;
    const coupon = await db.coupon.create(couponData);
    res.status(201).json(coupon);
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.coupon.destroy({ where: { id } });
    
    if (deleted === 0) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// ============================================
// PARENT MANAGEMENT
// ============================================

exports.getAllParents = async (req, res) => {
  try {
    const parents = await db.parent.findAll({
      include: [
        {
          model: db.user,
          as: 'user',
          attributes: { exclude: ['password'] }
        }
      ]
    });
    res.json(parents);
  } catch (error) {
    console.error('Error fetching parents:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getParentById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 [getParentById] Fetching parent ID: ${id}`);
    
    // Use a simpler approach: load parent first, then associations separately
    const parent = await db.parent.findOne({
      where: { id },
      include: [
        {
          model: db.user,
          as: 'user',
          attributes: { exclude: ['password'] },
          required: false
        }
      ]
    });
    
    if (!parent) {
      console.log(`❌ [getParentById] Parent ${id} not found`);
      return res.status(404).json({ message: 'Parent not found' });
    }
    
    // Convert Sequelize instance to plain JSON
    let parentData;
    try {
      parentData = parent.get ? parent.get({ plain: true }) : parent;
    } catch (getError) {
      console.error('❌ [getParentById] Error converting parent to plain object:', getError);
      console.error('❌ [getParentById] Parent object:', parent);
      // Fallback: try to serialize manually
      parentData = {
        id: parent.id,
        user_id: parent.user_id,
        created_at: parent.created_at,
        created_by: parent.created_by,
        user: parent.user ? (parent.user.get ? parent.user.get({ plain: true }) : parent.user) : null
      };
    }
    
    // Load associations separately to avoid nested include issues
    try {
      // Load students
      let students = [];
      try {
        students = await db.student.findAll({
          where: { parent_id: id },
          include: [
            {
              model: db.user,
              as: 'user',
              attributes: { exclude: ['password'] },
              required: false
            },
            {
              model: db.class,
              as: 'class',
              attributes: ['id', 'class_name'],
              required: false
            }
          ]
        });
      } catch (studentErr) {
        console.warn(`⚠️ [getParentById] Error loading students:`, studentErr.message);
        students = [];
      }
      
      // Load subscriptions
      let subscriptions = [];
      try {
        subscriptions = await db.subscription.findAll({
          where: { parent_id: id },
          include: [
            {
              model: db.product,
              as: 'product',
              attributes: ['id', 'name', 'billing_interval', 'trial_period_days', 'child_count'],
              required: false
            }
          ],
          order: [['created_at', 'DESC']]
        });
      } catch (subErr) {
        console.warn(`⚠️ [getParentById] Error loading subscriptions:`, subErr.message);
        subscriptions = [];
      }
      
      // Convert students to plain objects and attach homework scans
      if (Array.isArray(students) && students.length > 0) {
        parentData.student = await Promise.all(
          students.map(async (student) => {
            try {
              const studentPlain = student.get ? student.get({ plain: true }) : student;
              
              // Load homework scans for this student
              if (studentPlain && studentPlain.id) {
                try {
                  const scans = await db.homeworkScan.findAll({
                    where: { student_id: studentPlain.id },
                    attributes: ['id', 'raw_text', 'file_url', 'created_at'],
                    limit: 10,
                    order: [['created_at', 'DESC']]
                  });
                  studentPlain.homeworkscan = scans.map(s => (s.get ? s.get({ plain: true }) : s));
                } catch (scanErr) {
                  console.warn(`⚠️ [getParentById] Error loading homework scans for student ${studentPlain.id}:`, scanErr.message);
                  studentPlain.homeworkscan = [];
                }
              } else {
                studentPlain.homeworkscan = [];
              }
              
              return studentPlain;
            } catch (err) {
              console.warn(`⚠️ [getParentById] Error processing student:`, err.message);
              return null;
            }
          })
        );
        // Filter out null values
        parentData.student = parentData.student.filter(s => s !== null);
      } else {
        parentData.student = [];
      }
      
      // Convert subscriptions to plain objects
      if (Array.isArray(subscriptions) && subscriptions.length > 0) {
        parentData.subscriptions = subscriptions.map(s => (s.get ? s.get({ plain: true }) : s));
      } else {
        parentData.subscriptions = [];
      }
      
    } catch (assocError) {
      console.error('❌ [getParentById] Error loading associations:', assocError);
      console.error('❌ [getParentById] Association error stack:', assocError.stack);
      // Continue with empty associations rather than failing completely
      parentData.student = parentData.student || [];
      parentData.subscriptions = parentData.subscriptions || [];
    }
    
    console.log(`✅ [getParentById] Parent ${id} loaded successfully`);
    console.log(`📊 [getParentById] Parent ${id} has ${parentData.student?.length || 0} students`);
    console.log(`📊 [getParentById] Parent ${id} has ${parentData.subscriptions?.length || 0} subscriptions`);
    
    res.json({ data: parentData });
  } catch (error) {
    console.error('❌ [getParentById] Error fetching parent:', error);
    console.error('❌ [getParentById] Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.addparent = async (req, res) => {
  try {
    const parentData = req.body;
    const parent = await db.parent.create(parentData);
    res.status(201).json(parent);
  } catch (error) {
    console.error('Error creating parent:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.editParent = async (req, res) => {
  try {
    const { id } = req.params;
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
    const updated_by = req.user.id;

    console.log('📝 [editParent] Updating parent ID:', id);

    // Find parent by ID
    const parent = await db.parent.findByPk(id, {
      include: [{ model: db.user, as: 'user' }]
    });
    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    // Update user fields
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
    
    // Hash password if plain_pass is being updated
    if (plain_pass && plain_pass !== undefined && plain_pass !== null && plain_pass !== '') {
      const bcrypt = require('bcryptjs');
      userUpdateFields.password = await bcrypt.hash(plain_pass, 10);
      console.log('🔐 [editParent] Hashing password for parent');
    }
    
    // Fix: Handle username updates - if username is being set to empty string, set to null instead
    // This prevents login issues when username is cleared
    if (userUpdateFields.username === '') {
      userUpdateFields.username = null;
      console.log('📝 [editParent] Converting empty username to null');
    }
    
    // Remove undefined values
    Object.keys(userUpdateFields).forEach(key => {
      if (userUpdateFields[key] === undefined) {
        delete userUpdateFields[key];
      }
    });

    await parent.user.update(userUpdateFields);

    // Update parent fields
    const parentUpdateFields = {
      updated_by,
    };
    if (is_payer !== undefined) parentUpdateFields.is_payer = is_payer;

    await parent.update(parentUpdateFields);

    // Return updated parent with associations
    const updatedParent = await db.parent.findByPk(id, {
      include: [
        {
          model: db.user,
          as: 'user',
          attributes: { exclude: ['password'] },
        },
        {
          model: db.student,
          as: 'student',
          include: [
            {
              model: db.user,
              as: 'user',
              attributes: { exclude: ['password'] }
            }
          ]
        }
      ]
    });

    res.json({ message: "Parent updated successfully", parent: updatedParent });
  } catch (err) {
    console.error("❌ [editParent] Error updating parent:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteParent = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ [deleteParent] Attempting to delete parent ID: ${id}`);

    // Find parent with user association and check for children
    const parent = await db.parent.findByPk(id, {
      include: [
        { model: db.user, as: 'user' },
        { model: db.student, as: 'student' }
      ]
    });

    if (!parent) {
      console.log(`❌ [deleteParent] Parent not found: ${id}`);
      return res.status(404).json({ message: 'Parent not found' });
    }

    console.log(`✅ [deleteParent] Found parent: ${id}, user_id: ${parent.user_id}`);

    // Check if parent has children
    const children = parent.student || [];
    if (children.length > 0) {
      console.log(`⚠️ [deleteParent] Parent has ${children.length} children. Consider reassigning or deleting children first.`);
      // Optionally, you can uncomment this to prevent deletion if children exist:
      // return res.status(400).json({ 
      //   message: `Cannot delete parent with ${children.length} child(ren). Please reassign or delete children first.`,
      //   children_count: children.length
      // });
    }

    // Delete the parent record
    await parent.destroy();
    console.log(`✅ [deleteParent] Deleted parent record ${id}`);

    // Delete the associated user if it exists
    if (parent.user_id) {
      await db.user.destroy({ where: { id: parent.user_id } });
      console.log(`✅ [deleteParent] Deleted associated user ${parent.user_id}`);
    }

    console.log(`✅ [deleteParent] Successfully deleted parent ${id}`);
    return res.status(200).json({ message: 'Parent deleted successfully' });

  } catch (error) {
    console.error('❌ [deleteParent] Error deleting parent:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.updateParentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`📝 [updateParentStatus] Updating status for parent ID: ${id}`);

    const parent = await db.parent.findByPk(id, {
      include: [{ model: db.user, as: 'user' }]
    });

    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    const capitalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : undefined;
    
    if (capitalizedStatus && parent.user) {
      await parent.user.update({ status: capitalizedStatus });
      console.log(`✅ [updateParentStatus] Updated parent user status to: ${capitalizedStatus}`);
    }

    res.json({ message: "Parent status updated successfully" });
  } catch (err) {
    console.error("❌ [updateParentStatus] Error updating parent status:", err);
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// STUDENT MANAGEMENT
// ============================================

exports.getAllStudents = async (req, res) => {
  try {
    const students = await db.student.findAll({
      // All attributes are included by default, but we ensure JSONB fields are properly serialized
      include: [
        {
          model: db.user,
          as: 'user',
          attributes: { exclude: ['password'] }
        },
        {
          model: db.class,
          as: 'class',
          attributes: ['id', 'class_name']
        },
        {
          model: db.parent,
          as: 'parent',
          required: false, // Allow students without parents
          attributes: ['id'], // parent_id is in students table, not parents table
          include: [
            {
              model: db.user,
              as: 'user',
              required: false, // Allow parent records without user (shouldn't happen, but safe)
              attributes: { exclude: ['password'] }
            }
          ]
        }
      ]
    });
    
    // Convert Sequelize instances to plain objects to ensure associations are serialized
    const plainStudents = students.map(s => s.get({ plain: true }));
    
    // Debug: Log first student's buddy data
    if (plainStudents.length > 0) {
      console.log('📊 [getAllStudents] First student sample:', {
        id: plainStudents[0].id,
        hasClass: !!plainStudents[0].class,
        className: plainStudents[0].class?.class_name || 'N/A',
        hasParent: !!plainStudents[0].parent,
        parentName: plainStudents[0].parent?.user ? `${plainStudents[0].parent.user.first_name} ${plainStudents[0].parent.user.last_name}` : 'N/A',
        hasBuddy: !!plainStudents[0].buddy,
        buddy: plainStudents[0].buddy || 'N/A'
      });
    }
    
    res.json(plainStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await db.student.findOne({
      where: { id },
      include: [
        {
          model: db.user,
          as: 'user',
          attributes: { exclude: ['password'] }
        },
        {
          model: db.class,
          as: 'class',
          attributes: ['id', 'class_name']
        },
        {
          model: db.parent,
          as: 'parent',
          required: false, // Allow students without parents
          attributes: ['id'], // parent_id is in students table, not parents table
          include: [
            {
              model: db.user,
              as: 'user',
              required: false, // Allow parent records without user (shouldn't happen, but safe)
              attributes: { exclude: ['password'] }
            }
          ]
        },
        {
          model: db.student_subjects,
          as: 'subject',
          required: false, // Allow students without subjects
          attributes: ['id'],
          include: [
            {
              model: db.subject,
              as: 'subject',
              required: false, // Allow student_subjects without subject (shouldn't happen, but safe)
              attributes: ['id', 'subject_name']
            }
          ]
        }
      ]
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Convert to plain object to ensure associations are serialized
    const studentData = student.get({ plain: true });
    
    // Debug: Log parent and subjects data to help diagnose issues
    const subjectsArray = Array.isArray(studentData.subject) ? studentData.subject : [];
    const subjectsDetails = subjectsArray.map(s => ({
      studentSubjectId: s?.id,
      subjectId: s?.subject?.id,
      subjectName: s?.subject?.subject_name,
      hasNestedSubject: !!s?.subject
    }));
    
    console.log('📊 [getStudentById] Student data:', {
      studentId: studentData.id,
      hasParent: !!studentData.parent,
      parentId: studentData.parent?.id,
      parentUserId: studentData.parent?.user?.id,
      parentUserName: studentData.parent?.user ? `${studentData.parent.user.first_name} ${studentData.parent.user.last_name}` : 'N/A',
      parentUserEmail: studentData.parent?.user?.email || 'N/A',
      subjectsCount: subjectsArray.length,
      subjectsDetails: subjectsDetails,
      rawSubjectArray: subjectsArray.length > 0 ? subjectsArray[0] : null
    });
    
    // Return data directly - frontend parseEntity handles both formats: payload?.data ?? payload
    res.json(studentData);
  } catch (error) {
    console.error('❌ Error fetching student:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
};

exports.addstudent = async (req, res) => {
  try {
    const studentData = req.body;
    // Save all interests (onboarding preferences can be more than 2)
    // The limit of 2 was for manual "focus topics" only, not onboarding preferences
    // Allow all onboarding preferences to be saved
    const student = await db.student.create(studentData);
    res.status(201).json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.editStudent = async (req, res) => {
  try {
    const { id } = req.params;
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
      age,
      school_type,
      city,
      school_name,
      username,
      plain_pass,
      profile,
      interests,
      buddy
    } = req.body;
    const updated_by = req.user.id;

    console.log('📝 [editStudent] Updating student ID:', id);

    // Find student by ID
    const student = await db.student.findByPk(id, {
      include: [{ model: db.user, as: 'user' }]
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Update user fields
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
    
    // Hash password if plain_pass is being updated
    if (plain_pass && plain_pass !== undefined && plain_pass !== null && plain_pass !== '') {
      const bcrypt = require('bcryptjs');
      userUpdateFields.password = await bcrypt.hash(plain_pass, 10);
      console.log('🔐 [editStudent] Hashing password for student');
    }
    
    // Fix: Handle username updates - if username is being set to empty string, set to null instead
    // This prevents login issues when username is cleared
    if (userUpdateFields.username === '') {
      userUpdateFields.username = null;
      console.log('📝 [editStudent] Converting empty username to null');
    }
    
    // Remove undefined values
    Object.keys(userUpdateFields).forEach(key => {
      if (userUpdateFields[key] === undefined) {
        delete userUpdateFields[key];
      }
    });

    await student.user.update(userUpdateFields);
    
    // Update student fields
    const studentUpdateFields = {};
    if (class_id !== undefined) studentUpdateFields.class_id = class_id;
    if (parent_id !== undefined) studentUpdateFields.parent_id = parent_id;
    // Validate and convert age to integer - skip if invalid (like "-" or empty string)
    if (age !== undefined && age !== null && age !== "" && age !== "-") {
      const ageNum = parseInt(age, 10);
      if (!isNaN(ageNum) && ageNum > 0) {
        studentUpdateFields.age = ageNum;
      }
    }
    studentUpdateFields.updated_by = updated_by;
    
    // Update JSONB fields (profile, interests, buddy)
    if (profile !== undefined) studentUpdateFields.profile = profile;
    if (interests !== undefined) {
      // Save all interests (onboarding preferences can be more than 2)
      // The limit of 2 was for manual "focus topics" only, not onboarding preferences
      // Allow all onboarding preferences to be saved
      studentUpdateFields.interests = interests;
    }
    if (buddy !== undefined) studentUpdateFields.buddy = buddy;
    
    // Only update student fields if there are fields to update
    if (Object.keys(studentUpdateFields).length > 0) {
      await student.update(studentUpdateFields);
    }

    // Update subjects if provided
    if (subjects && Array.isArray(subjects)) {
      // Delete existing student-subject relationships
      await db.student_subjects.destroy({ where: { student_id: id } });
      
      // Create new student-subject relationships
      const subjectMappings = subjects.map(subject_id => ({
        student_id: id,
        subject_id: subject_id,
        created_by: updated_by
      }));
      
      await db.student_subjects.bulkCreate(subjectMappings);
    }

    // Return updated student with associations
    const updatedStudent = await db.student.findByPk(id, {
      include: [
        {
          model: db.user,
          as: 'user',
          attributes: { exclude: ['password'] },
        },
        {
          model: db.parent,
          as: 'parent',
          include: [
            {
              model: db.user,
              as: 'user',
              attributes: { exclude: ['password'] }
            }
          ]
        },
        {
          model: db.class,
          as: 'class',
          attributes: ['id', 'class_name']
        },
        {
          model: db.student_subjects,
          as: 'subject',
          attributes: ['id'],
          include: [
            {
              model: db.subject,
              as: 'subject',
              attributes: ['id', 'subject_name']
            }
          ]
        }
      ]
    });

    res.json({ message: "Student updated successfully", student: updatedStudent });
  } catch (err) {
    console.error("❌ [editStudent] Error updating student:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ [deleteStudent] Attempting to delete student ID: ${id}`);

    // Find student with user association
    const student = await db.student.findByPk(id, {
      include: [{ model: db.user, as: 'user' }]
    });

    if (!student) {
      console.log(`❌ [deleteStudent] Student not found: ${id}`);
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log(`✅ [deleteStudent] Found student: ${id}, user_id: ${student.user_id}`);

    // Delete related records first (student_subjects, homework scans)
    try {
      await db.student_subjects.destroy({ where: { student_id: id } });
      console.log(`✅ [deleteStudent] Deleted student-subject relationships`);
    } catch (err) {
      console.warn(`⚠️ [deleteStudent] Could not delete student-subject relationships:`, err.message);
    }

    // Delete the student record
    await student.destroy();
    console.log(`✅ [deleteStudent] Deleted student record ${id}`);

    // Delete the associated user if it exists
    if (student.user_id) {
      await db.user.destroy({ where: { id: student.user_id } });
      console.log(`✅ [deleteStudent] Deleted associated user ${student.user_id}`);
    }

    console.log(`✅ [deleteStudent] Successfully deleted student ${id}`);
    return res.status(200).json({ message: 'Student deleted successfully' });

  } catch (error) {
    console.error('❌ [deleteStudent] Error deleting student:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.updateStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`📝 [updateStudentStatus] Updating status for student ID: ${id}`);

    const student = await db.student.findByPk(id, {
      include: [{ model: db.user, as: 'user' }]
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const capitalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : undefined;
    
    if (capitalizedStatus && student.user) {
      await student.user.update({ status: capitalizedStatus });
      console.log(`✅ [updateStudentStatus] Updated student user status to: ${capitalizedStatus}`);
    }

    res.json({ message: "Student status updated successfully" });
  } catch (err) {
    console.error("❌ [updateStudentStatus] Error updating student status:", err);
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// TEACHER MANAGEMENT
// ============================================

exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await db.teacher.findAll({
      include: [
        {
          model: db.user,
          as: 'user',
          attributes: { exclude: ['password'] }
        },
        {
          model: db.class,
          as: 'class',
          attributes: ['id', 'class_name']
        }
      ]
    });
    
    // Convert Sequelize instances to plain objects to ensure associations are serialized
    const plainTeachers = teachers.map(t => t.get({ plain: true }));
    
    res.json(plainTeachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await db.teacher.findOne({
      where: { id },
      include: [
        {
          model: db.user,
          as: 'user',
          attributes: { exclude: ['password'] }
        },
        {
          model: db.class,
          as: 'class',
          attributes: ['id', 'class_name']
        }
      ]
    });
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Convert to plain object to ensure associations are serialized
    const teacherData = teacher.get({ plain: true });
    
    res.json(teacherData);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.addteacher = async (req, res) => {
  try {
    const teacherData = req.body;
    const teacher = await db.teacher.create(teacherData);
    res.status(201).json(teacher);
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.editTeacher = async (req, res) => {
  try {
    const { id } = req.params;
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
    const updated_by = req.user.id;

    console.log('📝 [editTeacher] Updating teacher ID:', id);

    // Find teacher by ID
    const teacher = await db.teacher.findByPk(id, {
      include: [{ model: db.user, as: 'user' }]
    });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Update user fields
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
    
    // Hash password if plain_pass is being updated
    if (plain_pass && plain_pass !== undefined && plain_pass !== null && plain_pass !== '') {
      const bcrypt = require('bcryptjs');
      userUpdateFields.password = await bcrypt.hash(plain_pass, 10);
      console.log('🔐 [editTeacher] Hashing password for teacher');
    }
    
    // Fix: Handle username updates - if username is being set to empty string, set to null instead
    // This prevents login issues when username is cleared
    if (userUpdateFields.username === '') {
      userUpdateFields.username = null;
      console.log('📝 [editTeacher] Converting empty username to null');
    }
    
    // Remove undefined values
    Object.keys(userUpdateFields).forEach(key => {
      if (userUpdateFields[key] === undefined) {
        delete userUpdateFields[key];
      }
    });

    await teacher.user.update(userUpdateFields);

    // Update teacher fields
    const teacherUpdateFields = {
      updated_by,
    };
    if (class_id !== undefined) teacherUpdateFields.class_id = class_id;

    await teacher.update(teacherUpdateFields);

    // Return updated teacher with associations
    const updatedTeacher = await db.teacher.findByPk(id, {
      include: [
        {
          model: db.user,
          as: 'user',
          attributes: { exclude: ['password'] },
        },
        {
          model: db.class,
          as: 'class',
          attributes: ['id', 'class_name']
        }
      ]
    });

    res.json({ message: "Teacher updated successfully", teacher: updatedTeacher });
  } catch (err) {
    console.error("❌ [editTeacher] Error updating teacher:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ [deleteTeacher] Attempting to delete teacher ID: ${id}`);

    // Find teacher with user association
    const teacher = await db.teacher.findByPk(id, {
      include: [{ model: db.user, as: 'user' }]
    });

    if (!teacher) {
      console.log(`❌ [deleteTeacher] Teacher not found: ${id}`);
      return res.status(404).json({ message: 'Teacher not found' });
    }

    console.log(`✅ [deleteTeacher] Found teacher: ${id}, user_id: ${teacher.user_id}`);

    // Delete the teacher record
    await teacher.destroy();
    console.log(`✅ [deleteTeacher] Deleted teacher record ${id}`);

    // Delete the associated user if it exists
    if (teacher.user_id) {
      await db.user.destroy({ where: { id: teacher.user_id } });
      console.log(`✅ [deleteTeacher] Deleted associated user ${teacher.user_id}`);
    }

    console.log(`✅ [deleteTeacher] Successfully deleted teacher ${id}`);
    return res.status(200).json({ message: 'Teacher deleted successfully' });

  } catch (error) {
    console.error('❌ [deleteTeacher] Error deleting teacher:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.updateTeacherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`📝 [updateTeacherStatus] Updating status for teacher ID: ${id}`);

    const teacher = await db.teacher.findByPk(id, {
      include: [{ model: db.user, as: 'user' }]
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const capitalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : undefined;
    
    if (capitalizedStatus && teacher.user) {
    await teacher.user.update({ status: capitalizedStatus });
      console.log(`✅ [updateTeacherStatus] Updated teacher user status to: ${capitalizedStatus}`);
    }

    res.json({ message: "Teacher status updated successfully" });
  } catch (err) {
    console.error("❌ [updateTeacherStatus] Error updating teacher status:", err);
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// STUDENT USAGE STATS
// ============================================

exports.getStudentUsageStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { sequelize } = db;

    console.log('📊 [getStudentUsageStats] Fetching stats for student ID:', id);

    // Get student info - use db.student instead of destructured Student
    const student = await db.student.findOne({
      where: { id },
      include: [
        {
          model: db.user,
          as: 'user',
          attributes: { exclude: ['password'] },
        },
      ],
    });

    if (!student) {
      console.log('❌ [getStudentUsageStats] Student not found:', id);
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log('✅ [getStudentUsageStats] Student found:', {
      id: student.id,
      user_id: student.user_id,
      name: `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim()
    });

    // Get homework scans count and recent scans - use db.homeworkScan
    const homeworkScans = await db.homeworkScan.findAll({
      where: { student_id: id },
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    const totalScans = await db.homeworkScan.count({
      where: { student_id: id },
    });

    // Get conversations count using direct SQL (if conversations table exists)
    let totalConversations = 0;
    let totalMessages = 0;
    try {
      const convResults = await sequelize.query(`
        SELECT COUNT(*)::INTEGER as count 
        FROM conversations 
        WHERE user_id = :user_id
      `, {
        replacements: { user_id: student.user_id },
        type: sequelize.QueryTypes.SELECT,
      });
      // Sequelize SELECT returns [results, metadata] where results is an array of rows
      const convData = Array.isArray(convResults) && convResults.length > 0 ? convResults[0] : convResults;
      totalConversations = convData && convData.length > 0 
        ? (parseInt(convData[0]?.count) || 0)
        : (parseInt(convData?.count) || 0);

      // Get messages count
      const msgResults = await sequelize.query(`
        SELECT COUNT(*)::INTEGER as count 
        FROM messages m
        INNER JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id = :user_id
      `, {
        replacements: { user_id: student.user_id },
        type: sequelize.QueryTypes.SELECT,
      });
      // Sequelize SELECT returns [results, metadata] where results is an array of rows
      const msgData = Array.isArray(msgResults) && msgResults.length > 0 ? msgResults[0] : msgResults;
      totalMessages = msgData && msgData.length > 0 
        ? (parseInt(msgData[0]?.count) || 0)
        : (parseInt(msgData?.count) || 0);
  } catch (err) {
      console.warn('⚠️ [getStudentUsageStats] Conversations/messages tables may not exist:', err.message);
      console.error('❌ [getStudentUsageStats] Error details:', err);
      // Don't throw - just use 0 values
      totalConversations = 0;
      totalMessages = 0;
    }

    console.log('📊 [getStudentUsageStats] Conversation stats:', {
      totalConversations,
      totalMessages,
      totalScans
    });

    // Calculate time spent (estimated: 5 minutes per homework scan + 2 minutes per conversation)
    const estimatedMinutes = (totalScans * 5) + (totalConversations * 2);
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;
    const timeSpent = `${hours}h ${minutes}m`;

    // Get progress data for last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const progressDataRaw = await sequelize.query(`
      SELECT 
        DATE(created_at)::TEXT as date,
        COUNT(*)::INTEGER as count
      FROM homework_scans
      WHERE student_id = :student_id
        AND created_at >= :start_date
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, {
      replacements: { student_id: id, start_date: fourteenDaysAgo },
      type: sequelize.QueryTypes.SELECT,
    });
    // Sequelize SELECT returns [results, metadata] where results is an array of rows
    // Handle different return formats
    let progressData = [];
    if (Array.isArray(progressDataRaw)) {
      if (progressDataRaw.length > 0 && Array.isArray(progressDataRaw[0])) {
        progressData = progressDataRaw[0]; // [results, metadata] format
      } else {
        progressData = progressDataRaw; // Direct array format
      }
    }
    
    console.log('📊 [getStudentUsageStats] Progress data:', {
      rawLength: Array.isArray(progressDataRaw) ? progressDataRaw.length : 'not array',
      dataLength: progressData.length,
      sample: progressData.slice(0, 2)
    });

    // Create progress bars data (14 days)
    const progressBars = [];
    const today = new Date();
    const dayLabels = [];

    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = Array.isArray(progressData) ? progressData.find(p => p.date === dateStr) : null;
      const count = dayData ? parseInt(dayData.count) : 0;
      const maxCount = Array.isArray(progressData) && progressData.length > 0
        ? Math.max(...progressData.map(p => parseInt(p.count || 0)), 1)
        : 1;
      const percentage = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;

      progressBars.push({
        value: percentage,
        highlight: i === 0 ? "orange" : null, // Highlight today
      });

      // Format day label
      const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      const dayName = dayNames[date.getDay()];
      const dayNum = date.getDate();
      dayLabels.push(`${dayName}. ${dayNum}`);
    }

    // Get recent activities (homework scans + conversations)
    const activities = [];
    
    // Add recent homework scans
    homeworkScans.slice(0, 5).forEach(scan => {
      activities.push({
        id: `scan-${scan.id}`,
        text: `Hausaufgabe gescannt: ${scan.detected_subject || 'Unbekannt'}`,
        when: new Date(scan.created_at).toLocaleDateString('de-DE', { 
          day: 'numeric', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }),
        tag: 'Hausaufgabe',
        type: 'homework',
      });
    });

    // Add recent conversations (if available)
    try {
      const [recentConvs] = await sequelize.query(`
        SELECT id, created_at 
        FROM conversations 
        WHERE user_id = :user_id
        ORDER BY created_at DESC 
        LIMIT 5
      `, {
        replacements: { user_id: student.user_id },
        type: sequelize.QueryTypes.SELECT,
      });

      if (recentConvs && Array.isArray(recentConvs)) {
        recentConvs.forEach(conv => {
      activities.push({
        id: `conv-${conv.id}`,
        text: `Chat-Sitzung gestartet`,
        when: new Date(conv.created_at).toLocaleDateString('de-DE', { 
          day: 'numeric', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }),
        tag: 'Chat',
        type: 'conversation',
      });
        });
      }
    } catch (err) {
      // Ignore if conversations table doesn't exist
    }

    // Sort activities by timestamp (most recent first) - use created_at for proper sorting
    activities.sort((a, b) => {
      // For homework scans, use the actual created_at
      const dateA = a.type === 'homework' ? new Date(homeworkScans.find(s => `scan-${s.id}` === a.id)?.created_at) : new Date(a.when);
      const dateB = b.type === 'homework' ? new Date(homeworkScans.find(s => `scan-${s.id}` === b.id)?.created_at) : new Date(b.when);
      return dateB - dateA;
    });

    // Format recent scans for display
    const recentScans = homeworkScans.slice(0, 5).map(scan => ({
      id: scan.id,
      title: scan.detected_subject || 'Hausaufgabe',
      when: new Date(scan.created_at).toLocaleDateString('de-DE', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: scan.processed_at ? 'Completed' : 'Pending',
    }));

    res.json({
      student: {
        id: student.id,
        name: `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim(),
        age: student.age,
        avatar: student.user?.avatar,
        gender: student.user?.gender,
      },
      stats: {
        lessonsCompleted: totalScans, // Using homework scans as lessons
        timeSpent: timeSpent,
        totalScans: totalScans,
        totalConversations: totalConversations,
        totalMessages: totalMessages,
      },
      progress: {
        bars: progressBars,
        labels: dayLabels,
      },
      activities: activities.slice(0, 10), // Limit to 10 most recent
      recentScans: recentScans,
    });
  } catch (error) {
    console.error('Error fetching student usage stats:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// ============================================
// STUB FUNCTIONS (to be implemented)
// ============================================

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await db.role.findAll();
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.addrole = async (req, res) => {
  try {
    const roleData = req.body;
    const role = await db.role.create(roleData);
    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
  const { id } = req.params;
    const updateData = req.body;
    await db.role.update(updateData, { where: { id } });
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    await db.role.destroy({ where: { id } });
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Classes, Subjects, Quizzes, Worksheets, Curriculum, Blog Posts, Agents, etc.
// These are stubbed out - implement as needed

const buildUserDisplayName = (user) => {
  if (!user || typeof user !== "object") return null;
  const first =
    user.first_name || user.firstName || user.given_name || user.name_first || "";
  const last =
    user.last_name || user.lastName || user.family_name || user.name_last || "";
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return user.username || user.email || user.name || null;
};

const attachCreatorMeta = async (plainClasses) => {
  if (!Array.isArray(plainClasses)) return plainClasses;

  const missingIds = Array.from(
    new Set(
      plainClasses
        .filter(
          (cls) =>
            !buildUserDisplayName(cls.userCreated) &&
            cls.created_by !== null &&
            cls.created_by !== undefined
        )
        .map((cls) => cls.created_by)
    )
  );

  let userMap = new Map();

  if (missingIds.length > 0) {
    try {
      const users = await db.user.findAll({
        where: { id: { [Op.in]: missingIds } },
        attributes: ["id", "first_name", "last_name", "email", "username"],
      });
      userMap = new Map(
        users.map((u) => {
          const plain = u.get ? u.get({ plain: true }) : u;
          return [plain.id, plain];
        })
      );
    } catch (err) {
      console.warn("attachCreatorMeta: failed to load users", err);
    }
  }

  return plainClasses.map((cls) => {
    const plain = cls;
    const displayName =
      buildUserDisplayName(plain.userCreated) ||
      buildUserDisplayName(userMap.get(plain.created_by)) ||
      null;

    plain.created_by_name = displayName || plain.created_by || null;
    plain.created_by_username =
      plain.userCreated?.username || userMap.get(plain.created_by)?.username || null;
    plain.created_by_email =
      plain.userCreated?.email || userMap.get(plain.created_by)?.email || null;
    return plain;
  });
};

exports.addclass = async (req, res) => {
  try {
    const classData = {
      ...req.body,
      created_by: req.user?.id || req.body.created_by || null,
    };
    const classItem = await db.class.create(classData);
    res.status(201).json(classItem);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const classItem = await db.class.findOne({
      where: { id },
      include: [
        {
          model: db.user,
          as: 'userCreated',
          attributes: ['id', 'first_name', 'last_name', 'email', 'username'],
          required: false
        }
      ]
    });
    if (!classItem) return res.status(404).json({ message: 'Class not found' });

    let plain = classItem.get ? classItem.get({ plain: true }) : classItem;
    [plain] = await attachCreatorMeta([plain]);
    res.json(plain);
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getAllClasses = async (req, res) => {
  try {
    const classes = await db.class.findAll({
      include: [
        {
          model: db.user,
          as: 'userCreated',
          attributes: ['id', 'first_name', 'last_name', 'email', 'username'],
          required: false
        }
      ],
      order: [['id', 'ASC']]
    });
    // Convert Sequelize instances to plain objects to ensure proper serialization
    const plainClasses = classes.map(cls => (cls.get ? cls.get({ plain: true }) : cls));
    const enriched = await attachCreatorMeta(plainClasses);
    res.json(enriched);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.editClass = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await db.class.update(updateData, { where: { id } });
    res.json({ message: 'Class updated successfully' });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.class.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.addsubject = async (req, res) => {
  try {
    const subjectData = req.body;
    const subject = await db.subject.create(subjectData);
    res.status(201).json(subject);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await db.subject.findAll({
      include: [
        {
          model: db.class,
          as: 'class',
          attributes: ['id', 'class_name'],
          required: false
        }
      ],
      order: [['id', 'ASC']]
    });
    // Convert Sequelize instances to plain objects to ensure proper serialization
    const plainSubjects = subjects.map(subj => {
      const plain = subj.get ? subj.get({ plain: true }) : subj;
      return plain;
    });
    res.json(plainSubjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getSubjectById = async (req, res) => {
  try {
  const { id } = req.params;
    const subject = await db.subject.findOne({ where: { id } });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.editSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await db.subject.update(updateData, { where: { id } });
    res.json({ message: 'Subject updated successfully' });
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    await db.subject.destroy({ where: { id } });
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Quiz implementations
exports.addquiz = async (req, res) => {
  try {
    const quizData = req.body;
    const quiz = await db.quiz.create(quizData);
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getQuizzes = async (req, res) => {
  try {
    const { page = 1, pageSize = 50 } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    const { count, rows } = await db.quiz.findAndCountAll({
      limit,
      offset,
      order: [['id', 'ASC']],
      include: [
        {
          model: db.quizItem,
          as: 'items',
          required: false
        }
      ]
    });

    // Convert Sequelize instances to plain objects
    const quizzes = rows.map(quiz => {
      const plain = quiz.get ? quiz.get({ plain: true }) : quiz;
      return plain;
    });

    // Return format that matches frontend expectations
    // Frontend can handle both array and object with items/data
    res.json({
      items: quizzes,
      data: quizzes, // Alternative format
      total: count,
      page: parseInt(page),
      pageSize: limit,
      per_page: limit, // Alternative format
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await db.quiz.findOne({
      where: { id },
      include: [
        {
          model: db.quizItem,
          as: 'items',
          required: false
        }
      ]
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const plainQuiz = quiz.get ? quiz.get({ plain: true }) : quiz;
    res.json(plainQuiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.quiz.destroy({ where: { id } });

    if (deleted === 0) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.editQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const quiz = await db.quiz.findOne({ where: { id } });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    await db.quiz.update(updateData, { where: { id } });
    const updatedQuiz = await db.quiz.findOne({
      where: { id },
      include: [
        {
          model: db.quizItem,
          as: 'items',
          required: false
        }
      ]
    });

    const plainQuiz = updatedQuiz.get ? updatedQuiz.get({ plain: true }) : updatedQuiz;
    res.json(plainQuiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Curriculum implementations
exports.addcurriculum = async (req, res) => {
  try {
    const curriculumData = req.body;
    const curriculum = await db.curriculum.create(curriculumData);
    res.status(201).json(curriculum);
  } catch (error) {
    console.error('Error creating curriculum:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getAllCurriculum = async (req, res) => {
  try {
    const curricula = await db.curriculum.findAll({
      order: [['created_at', 'DESC']]
    });

    // Convert Sequelize instances to plain objects
    const plainCurricula = curricula.map(curr => {
      const plain = curr.get ? curr.get({ plain: true }) : curr;
      return plain;
    });

    res.json(plainCurricula);
  } catch (error) {
    console.error('Error fetching curricula:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getCurriculumById = async (req, res) => {
  try {
    const { id } = req.params;
    const curriculum = await db.curriculum.findOne({ where: { id } });

    if (!curriculum) {
      return res.status(404).json({ message: 'Curriculum not found' });
    }

    const plainCurriculum = curriculum.get ? curriculum.get({ plain: true }) : curriculum;
    res.json(plainCurriculum);
  } catch (error) {
    console.error('Error fetching curriculum:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteCurriculum = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.curriculum.destroy({ where: { id } });

    if (deleted === 0) {
      return res.status(404).json({ message: 'Curriculum not found' });
    }

    res.json({ message: 'Curriculum deleted successfully' });
  } catch (error) {
    console.error('Error deleting curriculum:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.addWorksheet = async (req, res) => { res.status(501).json({ message: 'Not implemented' }); };
exports.getAllWorksheets = async (req, res) => { res.status(501).json({ message: 'Not implemented' }); };
exports.getWorksheetById = async (req, res) => { res.status(501).json({ message: 'Not implemented' }); };
exports.deleteWorksheet = async (req, res) => { res.status(501).json({ message: 'Not implemented' }); };

exports.addblogpost = async (req, res) => {
  try {
    const db = require("../models");
    const blogPostData = req.body;
    
    // Handle update if id is provided
    if (blogPostData.id) {
      const existingPost = await db.blogpost.findByPk(blogPostData.id);
      if (existingPost) {
        // Update existing post
        await existingPost.update(blogPostData);
        const updated = await db.blogpost.findByPk(blogPostData.id);
        return res.status(200).json(updated);
      }
    }
    
    // Create new post
    const blogPost = await db.blogpost.create(blogPostData);
    res.status(201).json(blogPost);
  } catch (error) {
    console.error('Error creating/updating blog post:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getAllBlogPosts = async (req, res) => {
  try {
    const db = require("../models");
    const { status, audience, slug } = req.query;
    
    const where = {};
    if (status) {
      where.status = status;
    }
    if (audience) {
      where.audience = audience;
    }
    if (slug) {
      where.slug = slug;
    }
    
    const blogPosts = await db.blogpost.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 100 // Limit to prevent huge responses
    });
    
    res.json(blogPosts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getBlogPostById = async (req, res) => {
  try {
    const db = require("../models");
    const { id } = req.params;
    const blogPost = await db.blogpost.findOne({ where: { id } });
    
    if (!blogPost) {
      return res.status(404).json({ message: 'Blog post not found' });
    }
    
    res.json(blogPost);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteBlogPost = async (req, res) => {
  try {
    const db = require("../models");
    const { id } = req.params;
    
    const deleted = await db.blogpost.destroy({
      where: { id }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ message: 'Blog post not found' });
    }
    
    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getAllStates = async (req, res) => {
  try {
    const db = require("../models");
    const states = await db.state.findAll({
      order: [['state_name', 'ASC']]
    });
    res.json(states);
  } catch (error) {
    console.error("❌ Error fetching states:", error);
    res.status(500).json({ message: error.message || "Failed to fetch states" });
  }
};

function safeJsonParse(value) {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function normalizeEntitiesInput(raw) {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => (entry === null || entry === undefined ? '' : String(entry).trim()))
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return undefined;
}

function normalizeStringArray(raw) {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => (entry === null || entry === undefined ? '' : String(entry).trim()))
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return undefined;
}

function buildPromptsPayload(body, entitiesForPrompt) {
  const rawPrompts =
    typeof body.prompts === 'string'
      ? safeJsonParse(body.prompts)
      : body.prompts;

  let prompts =
    rawPrompts && typeof rawPrompts === 'object' && !Array.isArray(rawPrompts)
      ? { ...rawPrompts }
      : {};

  const masterPrompt =
    [body.master_prompt, body.masterPrompt, body.master_promt, body.masterPromt, body.master_prompt_text, body.masterPromptText]
      .find((value) => typeof value === 'string' && value.trim());
  if (masterPrompt) {
    prompts.master_prompt = masterPrompt.trim();
  }

  const instructionsCandidate =
    [body.instructions, body.agent_instructions, rawPrompts?.instructions]
      .find((value) => typeof value === 'string' && value.trim());
  if (instructionsCandidate) {
    prompts.instructions = instructionsCandidate.trim();
  }

  const initialMessages = normalizeStringArray(
    body.initial_messages ?? body.initialMessages ?? rawPrompts?.initial_messages
  );
  if (initialMessages !== undefined) {
    prompts.initial_messages = initialMessages;
  }

  const suggestedMessages = normalizeStringArray(
    body.suggested_messages ?? body.suggestedMessages ?? rawPrompts?.suggested_messages
  );
  if (suggestedMessages !== undefined) {
    prompts.suggested_messages = suggestedMessages;
  }

  const files = Array.isArray(body.files ?? body.prompt_files ?? rawPrompts?.files)
    ? body.files ?? body.prompt_files ?? rawPrompts?.files
    : undefined;
  if (files && files.length) {
    prompts.files = files;
  }

  const urlCandidate =
    [body.url, body.source_url, body.sourceUrl, rawPrompts?.url]
      .find((value) => typeof value === 'string' && value.trim());
  if (urlCandidate) {
    prompts.url = urlCandidate.trim();
  }

  const apiCandidate =
    [body.api_endpoint, body.apiEndpoint, rawPrompts?.api]
      .find((value) => typeof value === 'string' && value.trim());
  if (apiCandidate) {
    prompts.api = apiCandidate.trim();
  }

  const fileNameCandidate =
    [body.file_name, body.fileName, body.filename, rawPrompts?.file_name]
      .find((value) => typeof value === 'string' && value.trim());
  if (fileNameCandidate) {
    prompts.file_name = fileNameCandidate.trim();
  }

  if (Array.isArray(entitiesForPrompt) && entitiesForPrompt.length) {
    prompts.entities = entitiesForPrompt;
  }

  if (Object.keys(prompts).length === 0) {
    return undefined;
  }

  return prompts;
}

function extractAgentPayload(body) {
  const payload = {};

  const nameCandidate =
    [body.name, body.agent_name, body.agentName]
      .find((value) => typeof value === 'string' && value.trim());
  if (nameCandidate) {
    payload.name = nameCandidate.trim();
  }

  if (body.description !== undefined) {
    payload.description = body.description;
  } else if (body.agent_description !== undefined) {
    payload.description = body.agent_description;
  }

  const entitiesCandidate = normalizeEntitiesInput(
    body.entities ?? body.entities_list ?? body.entity_list ?? body.prompts?.entities
  );
  if (entitiesCandidate !== undefined) {
    payload.entities = entitiesCandidate;
  }

  const gradeCandidate = body.grade ?? body.grade_id;
  if (gradeCandidate !== undefined && gradeCandidate !== null && gradeCandidate !== '') {
    payload.grade = gradeCandidate;
  }

  const stateCandidate = body.state ?? body.state_id;
  if (stateCandidate !== undefined && stateCandidate !== null && stateCandidate !== '') {
    payload.state = stateCandidate;
  }

  const fileNameCandidate = body.file_name ?? body.fileName ?? body.filename;
  if (fileNameCandidate !== undefined) {
    payload.file_name = fileNameCandidate;
  }

  const apiCandidate = body.api ?? body.api_endpoint ?? body.apiEndpoint;
  if (apiCandidate !== undefined) {
    payload.api = apiCandidate;
  }

  if (body.version !== undefined) {
    payload.version = body.version;
  } else if (body.agent_version !== undefined) {
    payload.version = body.agent_version;
  }

  if (body.stage !== undefined) {
    payload.stage = body.stage;
  } else if (body.agent_stage !== undefined) {
    payload.stage = body.agent_stage;
  }

  const promptsPayload = buildPromptsPayload(
    body,
    entitiesCandidate !== undefined ? entitiesCandidate : undefined
  );
  if (promptsPayload !== undefined) {
    payload.prompts = promptsPayload;
  }

  return payload;
}

function formatAgentResponse(agentInstance) {
  if (!agentInstance) {
    return agentInstance;
  }

  const plain = agentInstance.get ? agentInstance.get({ plain: true }) : agentInstance;
  const formatted = { ...plain };

  formatted.agent_name = formatted.agent_name || formatted.name || null;

  if (formatted.entities && !Array.isArray(formatted.entities)) {
    const normalized = normalizeEntitiesInput(formatted.entities);
    formatted.entities = normalized !== undefined ? normalized : [];
  } else if (!formatted.entities) {
    formatted.entities = [];
  }

  if (formatted.prompts && typeof formatted.prompts === 'string') {
    const parsed = safeJsonParse(formatted.prompts);
    formatted.prompts =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } else if (!formatted.prompts || typeof formatted.prompts !== 'object') {
    formatted.prompts = {};
  }

  if (formatted.api && !formatted.prompts.api) {
    formatted.prompts.api = formatted.api;
  }
  if (formatted.file_name && !formatted.prompts.file_name) {
    formatted.prompts.file_name = formatted.file_name;
  }
  if (formatted.entities?.length && !formatted.prompts.entities) {
    formatted.prompts.entities = formatted.entities;
  }

  return formatted;
}

exports.getAllAgents = async (req, res) => {
  try {
    const db = require("../models");
    const agents = await db.agentPromptSet.findAll({
      order: [['id', 'DESC']]
    });
    const formatted = agents.map(formatAgentResponse);
    res.json(formatted);
  } catch (error) {
    console.error("❌ Error fetching agents:", error);
    res.status(500).json({ message: error.message || "Failed to fetch agents" });
  }
};

exports.getAgentsForStudent = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRecord = await db.user.findOne({
      where: { id: userId },
      attributes: ["id", "state", "role_id"],
    });

    if (!userRecord) {
      return res.status(404).json({ message: "User not found" });
    }

    const studentRecord = await db.student.findOne({
      where: { user_id: userId },
      attributes: ["id", "class_id"],
    });

    if (!studentRecord) {
      // Not a student - return empty list to avoid leaking agent info
      return res.json([]);
    }

    const studentGrade = studentRecord.class_id;
    const studentState = userRecord.state || null;

    const gradeConditions = [
      { grade: null },
      { grade: "" },
      { grade: { [Op.is]: null } },
    ];

    if (studentGrade !== null && studentGrade !== undefined) {
      const gradeValue = String(studentGrade);
      gradeConditions.push(
        { grade: { [Op.eq]: gradeValue } }
      );
    }

    const stateConditions = [
      { state: null },
      { state: "" },
      { state: { [Op.is]: null } },
    ];

    if (studentState) {
      stateConditions.push(
        { state: { [Op.eq]: studentState } },
        { state: { [Op.eq]: String(studentState) } },
        { state: { [Op.eq]: String(studentState).toLowerCase() } },
        { state: { [Op.eq]: String(studentState).toUpperCase() } }
      );
    }

    if (!db.agentPromptSet) {
      return res.json([]);
    }

    const gradeFilter = {
      [Op.or]: gradeConditions,
    };

    const stateFilter = {
      [Op.or]: stateConditions,
    };

    const agents = await db.agentPromptSet.findAll({
      where: {
        [Op.and]: [gradeFilter, stateFilter],
      },
      order: [["id", "DESC"]],
    });

    const formatted = agents.map((agent) => {
      const base = formatAgentResponse(agent);
      return {
        ...base,
        matched_grade: studentGrade,
        matched_state: studentState,
      };
    });

    const normalizeGrade = (value) => {
      if (value === null || value === undefined) return null;
      const str = String(value).trim();
      return str.length ? str : null;
    };
    const normalizeState = (value) => {
      if (!value && value !== 0) return null;
      const str = String(value).trim();
      return str.length ? str.toLowerCase() : null;
    };

    const normStudentGrade = normalizeGrade(studentGrade);
    const normStudentState = normalizeState(studentState);

    const scoreAgent = (agent) => {
      const agentGrade = normalizeGrade(agent.grade);
      const agentState = normalizeState(agent.state);
      const gradeMatch =
        normStudentGrade && agentGrade && agentGrade === normStudentGrade;
      const stateMatch =
        normStudentState && agentState && agentState === normStudentState;
      const gradeSpecific = Boolean(agentGrade);
      const stateSpecific = Boolean(agentState);
      let score = 0;
      if (gradeMatch) score += 8;
      if (stateMatch) score += 4;
      if (gradeSpecific) score += 1;
      if (stateSpecific) score += 0.5;
      return score;
    };

    const scored = [...formatted].sort((a, b) => {
      const diff = scoreAgent(b) - scoreAgent(a);
      if (diff !== 0) return diff;
      return Number(b.id || 0) - Number(a.id || 0);
    });

    res.json(scored);
  } catch (error) {
    console.error("❌ Error fetching student agents:", error);
    res.status(500).json({ message: error.message || "Failed to fetch student agents" });
  }
};

exports.getPublicTables = async (req, res) => {
  try {
    const db = require("../models");
    // Return list of available entity/table names that can be used for agents
    const entityNames = [
      'BLOG_POSTS',
      'CLASSES',
      'SUBJECTS',
      'STUDENTS',
      'TEACHERS',
      'PARENTS',
      'QUIZZES',
      'CURRICULUMS',
      'WORKSHEETS',
      'HOMEWORK_SCANS',
      'INVOICES',
      'SUBSCRIPTIONS',
      'PRODUCTS',
      'COUPONS'
    ];
    res.json(entityNames);
  } catch (error) {
    console.error("❌ Error fetching public tables:", error);
    res.status(500).json({ message: error.message || "Failed to fetch entities" });
  }
};

exports.addAgent = async (req, res) => {
  try {
    const db = require("../models");
    const payload = extractAgentPayload(req.body);
    const name = payload.name;

    if (!name) {
      return res.status(400).json({ message: "Agent name is required" });
    }
    
    const agent = await db.agentPromptSet.create({
      name,
      description: payload.description ?? null,
      prompts: payload.prompts || {},
      entities: payload.entities || [],
      grade: payload.grade ?? null,
      state: payload.state ?? null,
      file_name: payload.file_name ?? null,
      api: payload.api ?? null,
      version: payload.version || 'v1',
      stage: payload.stage || 'staging',
      created_by: req.user?.id || null
    });
    
    res.status(201).json(formatAgentResponse(agent));
  } catch (error) {
    console.error("❌ Error adding agent:", error);
    res.status(500).json({ message: error.message || "Failed to add agent" });
  }
};

exports.updateAgent = async (req, res) => {
  try {
    const db = require("../models");
    const id = req.body.id ?? req.params?.id;

    if (!id) {
      return res.status(400).json({ message: "Agent ID is required" });
    }

    const payload = extractAgentPayload(req.body);
    const updateData = {};

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.prompts !== undefined) updateData.prompts = payload.prompts;
    if (payload.entities !== undefined) updateData.entities = payload.entities;
    if (payload.grade !== undefined) updateData.grade = payload.grade;
    if (payload.state !== undefined) updateData.state = payload.state;
    if (payload.file_name !== undefined) updateData.file_name = payload.file_name;
    if (payload.api !== undefined) updateData.api = payload.api;
    if (payload.version !== undefined) updateData.version = payload.version;
    if (payload.stage !== undefined) updateData.stage = payload.stage;

    updateData.updated_at = new Date();
    
    const [updated] = await db.agentPromptSet.update(updateData, {
      where: { id }
    });
    
    if (updated === 0) {
      return res.status(404).json({ message: "Agent not found" });
    }
    
    const agent = await db.agentPromptSet.findByPk(id);
    res.json(formatAgentResponse(agent));
  } catch (error) {
    console.error("❌ Error updating agent:", error);
    res.status(500).json({ message: error.message || "Failed to update agent" });
  }
};

exports.deleteAgent = async (req, res) => {
  try {
    const db = require("../models");
  const { id } = req.params;

    const deleted = await db.agentPromptSet.destroy({
      where: { id }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ message: "Agent not found" });
    }
    
    res.json({ message: "Agent deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting agent:", error);
    res.status(500).json({ message: error.message || "Failed to delete agent" });
  }
};

exports.getAiAgentSettings = async (req, res) => {
  try {
    const db = require("../models");
    // Get the first (and typically only) settings record, or create default if none exists
    let settings = await db.aiagentsettings.findOne({
      order: [['id', 'DESC']]
    });
    
    if (!settings) {
      // Create default settings if none exist
      settings = await db.aiagentsettings.create({
        child_default_ai: 'ChildAgent',
        parent_default_ai: 'ParentAgent',
        temperature: 0.7,
        openai_model: 'gpt-4o'
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error("❌ Error fetching AI agent settings:", error);
    res.status(500).json({ message: error.message || "Failed to fetch AI agent settings" });
  }
};

exports.updateAiAgentSettings = async (req, res) => {
  try {
    const db = require("../models");
    const { parent_default_ai, child_default_ai, temperature, openai_model } = req.body;
    
    // Get existing settings or create new one
    let settings = await db.aiagentsettings.findOne({
      order: [['id', 'DESC']]
    });
    
    const updateData = {};
    if (parent_default_ai !== undefined) updateData.parent_default_ai = parent_default_ai;
    if (child_default_ai !== undefined) updateData.child_default_ai = child_default_ai;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (openai_model !== undefined) updateData.openai_model = openai_model;
    
    if (settings) {
      await db.aiagentsettings.update(updateData, {
        where: { id: settings.id }
      });
      settings = await db.aiagentsettings.findByPk(settings.id);
    } else {
      settings = await db.aiagentsettings.create({
        parent_default_ai: parent_default_ai || 'ParentAgent',
        child_default_ai: child_default_ai || 'ChildAgent',
        temperature: temperature || 0.7,
        openai_model: openai_model || 'gpt-4o'
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error("❌ Error updating AI agent settings:", error);
    res.status(500).json({ message: error.message || "Failed to update AI agent settings" });
  }
};
exports.getHomeworks = async (req, res) => {
  try {
    const { student_id } = req.query;
    
    // Build where clause - if student_id is provided, filter by it; otherwise get all
    const whereClause = {};
    if (student_id) {
      const studentId = parseInt(student_id, 10);
      if (isNaN(studentId)) {
        return res.status(400).json({ message: 'student_id must be a valid number' });
      }
      whereClause.student_id = studentId;
      console.log("📚 Route /homeworkscans called with student_id:", studentId);
    } else {
      console.log("📚 Route /homeworkscans called - fetching ALL homework scans");
    }
    
    // Query homework scans with student relationship included
    const homeworks = await db.homeworkScan.findAll({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: [
        {
          model: db.student,
          as: 'student',
          required: false,
          include: [
            {
              model: db.user,
              as: 'user',
              attributes: { exclude: ['password'] },
              required: false
            },
            {
              model: db.class,
              as: 'class',
              attributes: ['id', 'class_name'],
              required: false
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    const count = homeworks.length;
    if (student_id) {
      console.log(`📚 Found ${count} homework submissions for student_id: ${student_id}`);
    } else {
      console.log(`📚 Found ${count} total homework scans in database`);
    }
    
    // Convert Sequelize instances to plain objects to ensure relationships are included
    const plainHomeworks = homeworks.map(hw => {
      const plain = hw.get ? hw.get({ plain: true }) : hw;
      // Log first scan structure for debugging
      if (hw.id === homeworks[0]?.id) {
        console.log("📋 Sample scan structure:", {
          id: plain.id,
          student_id: plain.student_id,
          hasStudent: !!plain.student,
          studentName: plain.student?.user?.first_name || "N/A",
          detected_subject: plain.detected_subject,
          task_type: plain.task_type,
          grade: plain.grade
        });
      }
      return plain;
    });
    
    res.json(plainHomeworks);
  } catch (err) {
    console.error("❌ Error fetching homework scans:", err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

// Get student_id from user_id
exports.getStudentIdByUserId = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ message: 'user_id query parameter is required' });
    }
    
    const userId = parseInt(user_id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'user_id must be a valid number' });
    }
    
    console.log("🔍 Looking up student_id for user_id:", userId);
    
    let studentId = null;
    
    // Try using Sequelize model first
    try {
      if (db.student) {
        const student = await db.student.findOne({
          where: { user_id: userId },
          attributes: ['id']
        });
        
        if (student) {
          studentId = student.id;
        }
      }
    } catch (modelErr) {
      console.warn("⚠️ Sequelize model query failed, trying raw SQL:", modelErr.message);
    }
    
    // Fallback to raw SQL if Sequelize fails
    if (!studentId) {
      try {
        const result = await db.sequelize.query(
          'SELECT id FROM students WHERE user_id = :userId LIMIT 1',
          {
            replacements: { userId },
            type: db.Sequelize.QueryTypes.SELECT
          }
        );
        
        if (result && result.length > 0) {
          studentId = result[0].id;
        }
      } catch (sqlErr) {
        console.error("❌ Raw SQL query also failed:", sqlErr.message);
        throw sqlErr;
      }
    }
    
    if (!studentId) {
      console.log("⚠️ No student record found for user_id:", userId);
      return res.status(404).json({ message: 'Student not found for this user' });
    }
    
    console.log("✅ Found student_id:", studentId, "for user_id:", userId);
    res.json({ student_id: studentId });
  } catch (err) {
    console.error("❌ Error fetching student_id:", err);
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({ 
      message: err.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Get a single homework scan by ID
exports.getHomeworkScanById = async (req, res) => {
  try {
    const scanId = parseInt(req.params.id, 10);
    if (isNaN(scanId)) {
      console.warn("⚠️ Invalid scan ID provided:", req.params.id);
      return res.status(400).json({ message: 'Invalid scan ID' });
    }

    console.log("📚 [getHomeworkScanById] Fetching homework scan by ID:", scanId);
    console.log("📚 [getHomeworkScanById] Request params:", req.params);
    console.log("📚 [getHomeworkScanById] Request method:", req.method);

    const scan = await db.homeworkScan.findOne({
      where: { id: scanId },
      include: [
        {
          model: db.student,
          as: 'student',
          required: false,
          include: [
            {
              model: db.user,
              as: 'user',
              attributes: { exclude: ['password'] },
              required: false
            },
            {
              model: db.class,
              as: 'class',
              attributes: ['id', 'class_name'],
              required: false
            }
          ]
        }
      ]
    });

    if (!scan) {
      console.log("⚠️ [getHomeworkScanById] Homework scan not found for ID:", scanId);
      // Check if any scans exist at all
      const totalScans = await db.homeworkScan.count();
      console.log("ℹ️ [getHomeworkScanById] Total scans in database:", totalScans);
      return res.status(404).json({ message: 'Homework scan not found' });
    }

    // Convert Sequelize instance to plain object
    const plainScan = scan.get ? scan.get({ plain: true }) : scan;
    
    console.log("✅ [getHomeworkScanById] Found homework scan:", {
      id: plainScan.id,
      student_id: plainScan.student_id,
      hasStudent: !!plainScan.student,
      detected_subject: plainScan.detected_subject
    });
    res.json(plainScan);
  } catch (err) {
    console.error("❌ [getHomeworkScanById] Error fetching homework scan by ID:", err);
    console.error("❌ [getHomeworkScanById] Error stack:", err.stack);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

exports.deleteHomeworkScan = async (req, res) => {
  try {
    const scanId = parseInt(req.params.id, 10);
    if (isNaN(scanId)) {
      return res.status(400).json({ message: 'Invalid scan ID' });
    }

    console.log("🗑️ Deleting homework scan by ID:", scanId);

    // Find the scan first to get file URLs for cleanup
    const scan = await db.homeworkScan.findOne({
      where: { id: scanId }
    });

    if (!scan) {
      console.log("⚠️ Homework scan not found for ID:", scanId);
      return res.status(404).json({ message: 'Homework scan not found' });
    }

    // Delete associated files if they exist
    const fs = require('fs');
    const path = require('path');
    
    if (scan.file_url) {
      try {
        const filePath = path.join(process.cwd(), scan.file_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("✅ Deleted file:", filePath);
        }
      } catch (fileErr) {
        console.warn("⚠️ Could not delete file:", scan.file_url, fileErr.message);
        // Continue with database deletion even if file deletion fails
      }
    }

    if (scan.completion_photo_url) {
      try {
        const completionPath = path.join(process.cwd(), scan.completion_photo_url);
        if (fs.existsSync(completionPath)) {
          fs.unlinkSync(completionPath);
          console.log("✅ Deleted completion photo:", completionPath);
        }
      } catch (fileErr) {
        console.warn("⚠️ Could not delete completion photo:", scan.completion_photo_url, fileErr.message);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete the scan from database
    await db.homeworkScan.destroy({
      where: { id: scanId }
    });

    console.log("✅ Homework scan deleted successfully:", scanId);
    res.json({ message: 'Homework scan deleted successfully' });
  } catch (err) {
    console.error("❌ Error deleting homework scan:", err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

exports.updateHomeworkCompletion = async (req, res) => {
  try {
    const scanId = Number(req.params.id);
    if (!scanId || Number.isNaN(scanId)) {
      return res.status(400).json({ message: "Valid homework scan id is required" });
    }

    const { completedAt, completionPhotoUrl, createdAt, status } = req.body || {};
    
    console.log("📝 updateHomeworkCompletion request:", {
      scanId,
      body: req.body,
      bodyKeys: Object.keys(req.body || {}),
      completedAt,
      completionPhotoUrl,
      createdAt,
      status,
      statusType: typeof status,
      statusValue: status,
      hasCompletedAt: typeof completedAt !== "undefined",
      hasCompletionPhotoUrl: typeof completionPhotoUrl !== "undefined",
      hasCreatedAt: typeof createdAt !== "undefined",
      hasStatus: typeof status !== "undefined" && status !== null && status !== ""
    });
    
    // Check if at least one field is provided
    const hasAnyField = (
      typeof completedAt !== "undefined" || 
      typeof completionPhotoUrl !== "undefined" || 
      typeof createdAt !== "undefined" || 
      (typeof status !== "undefined" && status !== null && status !== "")
    );
    
    if (!hasAnyField) {
      console.log("❌ No fields provided for update");
      return res.status(400).json({ message: "No fields provided for update" });
    }

    const userId = req.user?.id;
    const userRoleId = req.user?.role_id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // 🔥 Handle both student and parent users
    let allowedStudentIds = [];
    
    console.log("🔍 updateHomeworkCompletion authorization check:", {
      userId,
      userRoleId,
      scanId
    });
    
    if (userRoleId === 1) {
      // User is a student - check if they own this homework
      const studentRecord = await db.student.findOne({
        where: { user_id: userId },
        attributes: ["id"],
      });

      if (!studentRecord) {
        console.log("❌ Student profile not found for user_id:", userId);
        return res.status(403).json({ message: "Student profile not found for user" });
      }
      
      allowedStudentIds = [studentRecord.id];
      console.log("✅ Student authorized - student_id:", studentRecord.id);
    } else if (userRoleId === 2) {
      // User is a parent - check if homework belongs to any of their children
      const parentRecord = await db.parent.findOne({
        where: { user_id: userId },
        include: [
          {
            model: db.student,
            as: 'student',
            attributes: ['id']
          }
        ]
      });

      if (!parentRecord) {
        console.log("❌ Parent profile not found for user_id:", userId);
        return res.status(403).json({ message: "Parent profile not found for user" });
      }
      
      // Get all student IDs for this parent's children
      const children = parentRecord.student || [];
      allowedStudentIds = children.map(child => child.id);
      
      // 🔥 Fallback: If association didn't load properly, query directly
      if (allowedStudentIds.length === 0) {
        console.log("⚠️ No children from association, querying directly...");
        const directChildren = await db.student.findAll({
          where: { parent_id: parentRecord.id },
          attributes: ['id']
        });
        allowedStudentIds = directChildren.map(child => child.id);
      }
      
      if (allowedStudentIds.length === 0) {
        console.log("❌ No children found for parent_id:", parentRecord.id);
        return res.status(403).json({ message: "No children found for this parent" });
      }
      
      console.log("✅ Parent authorized - children student_ids:", allowedStudentIds);
    } else {
      console.log("❌ Invalid role_id:", userRoleId, "for user_id:", userId);
      return res.status(403).json({ message: "Only students and parents can update homework completion" });
    }

    const scanRecord = await db.homeworkScan.findByPk(scanId);
    if (!scanRecord) {
      return res.status(404).json({ message: "Homework scan not found" });
    }

    console.log("🔍 updateHomeworkCompletion check:", {
      scanId,
      scanStudentId: scanRecord.student_id,
      userId,
      userRoleId,
      allowedStudentIds,
      scanBelongsToAllowed: scanRecord.student_id && allowedStudentIds.includes(Number(scanRecord.student_id))
    });

    // 🔥 Scan must always have a student_id
    if (!scanRecord.student_id) {
      // If scan has no student_id and user is a student, assign it to them
      if (userRoleId === 1 && allowedStudentIds.length > 0) {
        console.log("⚠️ Scan has no student_id - will assign to student:", allowedStudentIds[0]);
        // We'll set the student_id in the updates below
      } else {
        console.log("🚫 Access denied - scan has no student_id and cannot be assigned");
        return res.status(403).json({ message: "Homework scan must have a student assignment" });
      }
    } else {
      // Scan has a student_id - must match one of the allowed student IDs
      const scanStudentId = Number(scanRecord.student_id);
      let needsStudentIdCorrection = false;
      
      if (!allowedStudentIds.includes(scanStudentId)) {
        // 🔥 For parents: Double-check if this student actually belongs to them (in case association didn't load)
        if (userRoleId === 2) {
          console.log("⚠️ Student not in association list, checking directly...");
          const parentRecord = await db.parent.findOne({
            where: { user_id: userId },
            attributes: ['id']
          });
          if (parentRecord) {
            const directCheck = await db.student.findOne({
              where: { 
                id: scanStudentId,
                parent_id: parentRecord.id
              },
              attributes: ['id']
            });
            if (directCheck) {
              console.log("✅ Student found via direct check - allowing access");
              // Allow the update
            } else {
              // 🔥 Scan has wrong student_id - will correct it below
              if (allowedStudentIds.length > 0) {
                needsStudentIdCorrection = true;
                console.log(`⚠️ Scan has wrong student_id (${scanStudentId}), will correct to one of:`, allowedStudentIds);
              } else {
                console.log("🚫 Access denied - scan student_id:", scanStudentId, "does not belong to parent_id:", parentRecord.id);
                return res.status(403).json({ message: "You do not have access to this homework scan" });
              }
            }
          } else {
            console.log("🚫 Access denied - parent not found");
            return res.status(403).json({ message: "You do not have access to this homework scan" });
          }
        } else {
          console.log("🚫 Access denied - scan student_id:", scanStudentId, "allowed IDs:", allowedStudentIds, "userRoleId:", userRoleId);
          return res.status(403).json({ message: "You do not have access to this homework scan" });
        }
      }
      
      // Store flag for later use in updates
      if (needsStudentIdCorrection) {
        scanRecord._needsStudentIdCorrection = true;
      }
    }

    const updates = {};
    if (completedAt !== undefined) {
      const date = completedAt ? new Date(completedAt) : null;
      updates.completed_at = date && !Number.isNaN(date.getTime()) ? date : null;
    }
    if (completionPhotoUrl !== undefined) {
      updates.completion_photo_url = completionPhotoUrl || null;
    }
    if (createdAt !== undefined) {
      if (createdAt) {
        const date = new Date(createdAt);
        if (!Number.isNaN(date.getTime())) {
          updates.created_at = date;
          console.log("✅ Updating created_at to:", date.toISOString());
        } else {
          return res.status(400).json({ message: "Invalid createdAt date format" });
        }
      } else {
        return res.status(400).json({ message: "createdAt cannot be null or empty" });
      }
    }
    
    if (status !== undefined) {
      const validStatuses = ['pending', 'completed', 'do_it_later'];
      const statusStr = String(status).trim();
      console.log("🔍 Status validation:", {
        received: status,
        asString: statusStr,
        isValid: validStatuses.includes(statusStr)
      });
      
      if (validStatuses.includes(statusStr)) {
        updates.status = statusStr;
        console.log("✅ Updating status to:", statusStr);
        
        // If status is 'completed', also set completed_at if not already set
        if (statusStr === 'completed' && !updates.completed_at && !scanRecord.completed_at) {
          updates.completed_at = new Date();
        }
      } else {
        console.log("❌ Invalid status received:", status, "Valid options:", validStatuses);
        return res.status(400).json({ 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          received: status,
          validOptions: validStatuses
        });
      }
    }
    
    // 🔥 If scan has no student_id and user is a student, assign it to them
    if (!scanRecord.student_id && userRoleId === 1 && allowedStudentIds.length > 0) {
      updates.student_id = allowedStudentIds[0];
      console.log("✅ Assigning scan to student_id:", allowedStudentIds[0]);
    }
    
    // 🔥 If scan has wrong student_id and user is a parent, correct it to one of their children
    if (scanRecord._needsStudentIdCorrection && allowedStudentIds.length > 0) {
      // Use the first child's ID (or if only one child, use that)
      const correctStudentId = allowedStudentIds[0];
      updates.student_id = correctStudentId;
      console.log(`✅ Correcting scan student_id from ${scanRecord.student_id} to ${correctStudentId}`);
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    await db.homeworkScan.update(updates, { where: { id: scanId } });
    const refreshed = await db.homeworkScan.findByPk(scanId);

    res.json(refreshed);
  } catch (error) {
    console.error("❌ Error updating homework completion:", error);
    res.status(500).json({ message: error.message || "Failed to update homework completion" });
  }
};
exports.getStudentApiUsage = async (req, res) => {
  try {
    const { student_id } = req.query;
    const { sequelize } = db;
    
    if (!student_id) {
      return res.status(400).json({ message: 'student_id is required' });
    }
    
    // Check if API usage columns exist in homework_scans table
    try {
      const [columnCheck] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'homework_scans' 
        AND column_name IN ('api_tokens_used', 'api_cost_usd')
      `);
      
      if (columnCheck.length < 2) {
        return res.status(200).json({ 
          requiresMigration: true,
          message: 'API usage columns not found. Please run the migration script.',
          needsMigration: true
        });
      }
    } catch (migrationCheckError) {
      console.warn('Could not check for API usage columns:', migrationCheckError);
      // Continue anyway - might be a permission issue
    }
    
    // Get student info - use db.student
    const student = await db.student.findOne({
      where: { id: student_id },
      include: [
        {
          model: db.user,
          as: 'user',
          attributes: { exclude: ['password'] },
        },
      ],
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Get all homework scans with API usage data - use db.homeworkScan
    const homeworkScans = await db.homeworkScan.findAll({
      where: { student_id: student_id },
      attributes: ['id', 'api_tokens_used', 'api_cost_usd', 'detected_subject', 'created_at'],
      order: [['created_at', 'DESC']],
    });
    
    // Calculate totals
    const totalTokens = homeworkScans.reduce((sum, scan) => sum + (scan.api_tokens_used || 0), 0);
    const totalCost = homeworkScans.reduce((sum, scan) => sum + parseFloat(scan.api_cost_usd || 0), 0);
    const scanCount = homeworkScans.length;
    
    // Calculate usage by time period (last 7 days, 30 days, all time)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const last7Days = homeworkScans.filter(s => new Date(s.created_at) >= sevenDaysAgo);
    const last30Days = homeworkScans.filter(s => new Date(s.created_at) >= thirtyDaysAgo);
    
    const tokens7Days = last7Days.reduce((sum, s) => sum + (s.api_tokens_used || 0), 0);
    const cost7Days = last7Days.reduce((sum, s) => sum + parseFloat(s.api_cost_usd || 0), 0);
    
    const tokens30Days = last30Days.reduce((sum, s) => sum + (s.api_tokens_used || 0), 0);
    const cost30Days = last30Days.reduce((sum, s) => sum + parseFloat(s.api_cost_usd || 0), 0);
    
    // Group by subject
    const usageBySubject = {};
    homeworkScans.forEach(scan => {
      const subject = scan.detected_subject || 'Unknown';
      if (!usageBySubject[subject]) {
        usageBySubject[subject] = { tokens: 0, cost: 0, count: 0 };
      }
      usageBySubject[subject].tokens += (scan.api_tokens_used || 0);
      usageBySubject[subject].cost += parseFloat(scan.api_cost_usd || 0);
      usageBySubject[subject].count += 1;
    });
    
    // Format response
    const response = {
      student_id: parseInt(student_id),
      student_name: `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim(),
      overview: {
        total_tokens: totalTokens,
        total_cost_usd: parseFloat(totalCost.toFixed(6)),
        total_scans: scanCount,
        average_tokens_per_scan: scanCount > 0 ? Math.round(totalTokens / scanCount) : 0,
        average_cost_per_scan: scanCount > 0 ? parseFloat((totalCost / scanCount).toFixed(6)) : 0,
      },
      periods: {
        last_7_days: {
          tokens: tokens7Days,
          cost_usd: parseFloat(cost7Days.toFixed(6)),
          scans: last7Days.length,
        },
        last_30_days: {
          tokens: tokens30Days,
          cost_usd: parseFloat(cost30Days.toFixed(6)),
          scans: last30Days.length,
        },
        all_time: {
          tokens: totalTokens,
          cost_usd: parseFloat(totalCost.toFixed(6)),
          scans: scanCount,
        },
      },
      by_subject: Object.entries(usageBySubject).map(([subject, data]) => ({
        subject,
        tokens: data.tokens,
        cost_usd: parseFloat(data.cost.toFixed(6)),
        scan_count: data.count,
      })),
      recent_scans: homeworkScans.slice(0, 10).map(scan => {
        const cost = scan.api_cost_usd != null ? parseFloat(scan.api_cost_usd) : 0;
        return {
          id: scan.id,
          tokens: scan.api_tokens_used || 0,
          cost_usd: parseFloat(cost.toFixed(6)),
          subject: scan.detected_subject || 'Unknown',
          date: scan.created_at,
        };
      }),
      requiresMigration: false,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching student API usage:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
