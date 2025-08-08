import { Outlet } from "react-router-dom";
import { Layout } from "antd";

const { Content } = Layout;

const SchoolLayout = () => {
  return (
  
 
        <Content >
          <Outlet />
        </Content>

  );
};

export default SchoolLayout;
