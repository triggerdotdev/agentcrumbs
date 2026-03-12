import { Composition } from "remotion";
import { AgentCrumbsDemo } from "./AgentCrumbsDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AgentCrumbsDemo"
      component={AgentCrumbsDemo}
      durationInFrames={849}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
