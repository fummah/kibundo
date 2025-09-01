import { Link } from "react-router-dom";
import { HomeOutlined, PlusCircleOutlined, ReadOutlined, MessageOutlined, SettingOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

export default function BottomTabBar({
  routes = {
    home: "/parent",
    addChild: "/parent/myfamily/family?add=1",
    news: "/parent/communications/news",
    tickets: "/parent/helpdesk/tickets", // Feedback -> Tickets (Tasks hidden)
    settings: "/parent/settings",
  },
}) {
  const { t } = useTranslation();
  const base = "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[12px] font-semibold";
  const item = "text-lime-900/90 hover:text-lime-950 transition-colors";
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-lime-400/90 backdrop-blur border-t border-lime-500/30 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] bottom-tabs">
      <div className="mx-auto max-w-[720px] px-2 flex">
        <Link to={routes.home} className={`${base} ${item}`}>
          <HomeOutlined className="text-xl" />
          <span>{t("parent.nav.home")}</span>
        </Link>
        <Link to={routes.addChild} className={`${base} ${item}`}>
          <PlusCircleOutlined className="text-xl" />
          <span>{t("parent.nav.addChild")}</span>
        </Link>
        <Link to={routes.news} className={`${base} ${item}`}>
          <ReadOutlined className="text-xl" />
          <span>{t("parent.nav.news")}</span>
        </Link>
        <Link to={routes.tickets} className={`${base} ${item}`}>
          <MessageOutlined className="text-xl" />
          <span>{t("parent.nav.feedback")}</span>
        </Link>
        <Link to={routes.settings} className={`${base} ${item}`}>
          <SettingOutlined className="text-xl" />
          <span>{t("parent.nav.settings")}</span>
        </Link>
      </div>
    </nav>
  );
}
