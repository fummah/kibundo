import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Skeleton, Result, Button, message } from "antd";
import dayjs from "dayjs";
import api from "@/api/axios";


export default function BlogPreviewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get(`/blogpost/${id}`); // should return drafts
        if (!alive) return;
        setPost(data?.data ?? data ?? null);
      } catch (e) {
        messageApi.error("Could not load post");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return <Card className="max-w-5xl mx-auto my-6 rounded-2xl"><Skeleton active paragraph={{ rows: 12 }} /></Card>;
  }

  if (!post) {
    return (
      <Result
        status="404"
        title="Post not found"
        subTitle="Draft might not exist or you don't have permission."
        extra={<Button onClick={() => nav(-1)}>Back</Button>}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {contextHolder}
      <BlogPost
        title={post.title}
        subtitle={post.subtitle}
        heroUrl={post.thumbnail_url}
        tags={Array.isArray(post.tags) ? post.tags : []}
        bodyHtml={post.body_html}
        status={post.status}
        publishedAt={post.published_at ? dayjs(post.published_at) : null}
        updatedAt={post.updated_at ? dayjs(post.updated_at) : null}
        showTOC
      />
    </div>
  );
}
