import { BackLink, Page, Title, TopBar } from "./profileStyles";

export default function ProfileLayout({
  title,
  backTo,
  children,
}: {
  title: string;
  backTo: string;
  children: React.ReactNode;
}) {
  return (
    <Page>
      <TopBar>
        <BackLink to={backTo}>← 返回</BackLink>
        <Title>{title}</Title>
        <span style={{ width: 56 }} />
      </TopBar>
      {children}
    </Page>
  );
}
