// src/pages/parent/homework/Homework.jsx
import React from "react";
import { Card, Table, Tag, Progress } from "antd";
import bottomBg from "@/assets/backgrounds/bottom.png";
import globalBg from "@/assets/backgrounds/global-bg.png";
import buddyImg from "@/assets/buddies/kibundo-buddy.png";

const Homework = () => {
  const columns = [
    {
      title: "Fächer",
      dataIndex: "subject",
      key: "subject",
    },
    {
      title: "Was",
      dataIndex: "what",
      key: "what",
    },
    {
      title: "Beschreibung",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Bis wann",
      dataIndex: "due",
      key: "due",
    },
    {
      title: "Fertig",
      dataIndex: "done",
      key: "done",
      render: (done) =>
        done ? <Tag color="green">✔</Tag> : <Tag color="orange">offen</Tag>,
    },
  ];

  const data = [
    {
      key: 1,
      subject: "Mathe",
      what: "Multiplikation",
      description: "Multiplikations Aufgaben",
      due: "Mi. 07.08",
      done: false,
    },
    {
      key: 2,
      subject: "Mathe",
      what: "Division",
      description: "Geteilt durch",
      due: "Mi. 07.08",
      done: true,
    },
    {
      key: 3,
      subject: "Mathe",
      what: "Üben",
      description: "7er Reihe üben",
      due: "Do. 08.08",
      done: false,
    },
    {
      key: 4,
      subject: "Deutsch",
      what: "Lesen",
      description: "Lesen inkl. Beschreibung",
      due: "Mi. 07.08",
      done: false,
    },
    {
      key: 5,
      subject: "Deutsch",
      what: "Aufsatz",
      description: "Über Elefanten in der Wildnis",
      due: "Mo. 12.08",
      done: false,
    },
    {
      key: 6,
      subject: "Sonstiges",
      what: "Basteln",
      description: "Kleinen Drachen basteln",
      due: "Mo. 12.08",
      done: false,
    },
  ];

  return (
    <div
      className="relative min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${globalBg})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent" />
      <div className="relative flex flex-col items-center p-4">
        {/* Header */}
        <h1 className="text-2xl font-bold mb-2">Hausaufgaben</h1>
        <div className="flex justify-between items-center w-full max-w-md mb-4">
          <div className="flex-1 text-center">
            <div className="text-orange-500 font-bold">1</div>
            <div className="text-sm">Sammeln</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-gray-400 font-bold">2</div>
            <div className="text-sm">Machen</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-gray-400 font-bold">3</div>
            <div className="text-sm">Rückmeldung</div>
          </div>
        </div>

        {/* Buddy */}
        <img
          src={buddyImg}
          alt="Buddy"
          className="w-32 h-32 object-contain mb-4"
        />

        {/* Aufgaben */}
        <Card
          className="w-full max-w-md rounded-[22px] shadow-md"
          title="Deine Aufgaben"
        >
          <Table
            columns={columns}
            dataSource={data}
            pagination={false}
            size="small"
          />
        </Card>
      </div>

      {/* Bottom background */}
      <img
        src={bottomBg}
        alt="Bottom Background"
        className="absolute bottom-0 left-0 w-full object-cover"
      />
    </div>
  );
};

export default Homework;
