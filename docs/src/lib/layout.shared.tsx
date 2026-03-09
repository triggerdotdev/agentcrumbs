import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'agentcrumbs',
    },
    links: [
      {
        text: 'GitHub',
        url: 'https://github.com/triggerdotdev/agentcrumbs',
        external: true,
      },
    ],
  };
}
