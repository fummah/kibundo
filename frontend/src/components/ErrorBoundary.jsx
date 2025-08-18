import React from "react";
import { Result, Button } from "antd";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    // Hook up to monitoring if desired
    console.error("ErrorBoundary caught:", error, info);
  }
  handleReset = () => {
    this.setState({ error: null });
    // Or window.location.reload();
  };
  render() {
    if (this.state.error) {
      return (
        <Result
          status="500"
          title="Something went wrong"
          subTitle={this.state.error?.message || "An unexpected error occurred."}
          extra={<Button type="primary" onClick={this.handleReset}>Try again</Button>}
        />
      );
    }
    return this.props.children;
  }
}
