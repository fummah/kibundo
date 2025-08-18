import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  Typography,
  Button,
  Space,
  Modal,
  Select,
  Popconfirm,
  Skeleton,
  Descriptions,
  Grid,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

import PageHeader from "@/components/PageHeader.jsx";
import FluidTable from "@/components/FluidTable.jsx";
import { SafeText, SafeDate } from "@/utils/safe";

import {
  getSubject,
  listSubjectQuizzes,
  listQuizzes,
  linkQuizToSubject,
  unlinkQuizFromSubject,
} from "@/pages/academics/_api";

const { Title } = Typography;
const { useBreakpoint } = Grid;

export default function SubjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const screens = useBreakpoint();

  const [subject, setSubject] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  // QUIET load subject + quizzes: swallow errors, show blanks
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const subj = await getSubject(id).catch(() => null);
        if (!mounted) return;
        setSubject(subj);

        const subjQuizzes = await listSubjectQuizzes(id).catch(() => []);
        if (!mounted) return;
        setQuizzes(Array.isArray(subjQuizzes) ? subjQuizzes : []);

        const all = await listQuizzes().catch(() => []);
        if (!mounted) return;
        setAllQuizzes(Array.isArray(all) ? all : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const availableQuizzes = useMemo(() => {
    const linkedIds = new Set((quizzes || []).map((q) => q.id));
    return (allQuizzes || []).filter((q) => !linkedIds.has(q.id));
  }, [allQuizzes, quizzes]);

  const handleAddQuiz = async () => {
    if (!selectedQuiz) return;
    try {
      await linkQuizToSubject(id, selectedQuiz);
      const subjQuizzes = await listSubjectQuizzes(id).catch(() => []);
      setQuizzes(Array.isArray(subjQuizzes) ? subjQuizzes : []);
    } finally {
      setModalOpen(false);
      setSelectedQuiz(null);
    }
  };

  const handleRemoveQuiz = async (quizId) => {
    try {
      await unlinkQuizFromSubject(id, quizId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch {
      // keep quiet
    }
  };

  const columns = useMemo(
    () => [
      { title: "Quiz Title", dataIndex: "title", key: "title", render: (v) => <SafeText value={v} /> },
      {
        title: "Actions",
        key: "actions",
        width: 100,
        render: (_, record) => (
          <Popconfirm title="Remove this quiz?" onConfirm={() => handleRemoveQuiz(record.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Subject"
        subtitle="Manage quiz links for this subject."
        extra={
          <Space wrap>
            <Button onClick={() => navigate(-1)}>Back</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              Add Quiz
            </Button>
          </Space>
        }
      />

      <div className="p-3 md:p-4">
        {loading ? (
          <Skeleton active />
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Card>
              <Descriptions bordered column={screens.md ? 2 : 1}>
                <Descriptions.Item label="Name"><SafeText value={subject?.name} /></Descriptions.Item>
                <Descriptions.Item label="Code"><SafeText value={subject?.code} /></Descriptions.Item>
                <Descriptions.Item label="Description"><SafeText value={subject?.description} /></Descriptions.Item>
                <Descriptions.Item label="Created"><SafeDate value={subject?.created_at} /></Descriptions.Item>
                <Descriptions.Item label="Updated"><SafeDate value={subject?.updated_at} /></Descriptions.Item>
              </Descriptions>
              <Space style={{ marginTop: 12 }} wrap>
                <Button onClick={() => navigate(`/admin/academics/subjects/${id}/edit`)}>Edit</Button>
              </Space>
            </Card>

            <Card
              title={<Title level={4} style={{ margin: 0 }}>Linked Quizzes</Title>}
              extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                  Add Quiz
                </Button>
              }
              bodyStyle={{ padding: 0 }}
              className="overflow-hidden"
            >
              <FluidTable
                dataSource={Array.isArray(quizzes) ? quizzes : []}
                columns={columns}
                rowKey="id"
                pagination={false}
              />
              {(!quizzes || quizzes.length === 0) && (
                <div className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">
                  No quizzes linked yet — use “Add Quiz”.
                </div>
              )}
            </Card>
          </Space>
        )}
      </div>

      {/* Add Quiz Modal */}
      <Modal
        title="Link Quiz to Subject"
        open={modalOpen}
        onOk={handleAddQuiz}
        onCancel={() => setModalOpen(false)}
        okText="Add"
        width={Math.min(560, typeof window !== "undefined" ? window.innerWidth - 32 : 560)}
      >
        <Select
          style={{ width: "100%" }}
          placeholder="Select a quiz"
          value={selectedQuiz}
          onChange={setSelectedQuiz}
          showSearch
          optionFilterProp="label"
          options={(availableQuizzes || []).map((quiz) => ({
            value: quiz.id,
            label: quiz.title || "–",
          }))}
        />
      </Modal>
    </div>
  );
}
