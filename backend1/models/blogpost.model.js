module.exports = (sequelize, DataTypes) => {
  const BlogPost = sequelize.define('BlogPost', {
    id: { 
        type: DataTypes.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
    },
    title: DataTypes.TEXT,
    subtitle: DataTypes.TEXT,
    slug: { 
        type: DataTypes.TEXT, 
        unique: true 
    },
    body_md: DataTypes.TEXT,
    body_html: DataTypes.TEXT,
    thumbnail_url: DataTypes.TEXT,
    audience: { 
      type: DataTypes.ENUM('parents','teachers','both'),
      defaultValue: 'parents'
    },
    status: {
      type: DataTypes.ENUM('draft','pending_review','published'),
      defaultValue: 'draft'
    },
    tags: DataTypes.ARRAY(DataTypes.TEXT),
    seo: DataTypes.JSONB,
    author_id: DataTypes.INTEGER,
    scheduled_for: DataTypes.DATE,
    published_at: DataTypes.DATE,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    created_by: {
      type: DataTypes.STRING, // updated from TIME to STRING (VARCHAR)
      allowNull: true
    }
  }, {
    tableName: 'blog_posts',
    timestamps: false
  });
  return BlogPost;
};
