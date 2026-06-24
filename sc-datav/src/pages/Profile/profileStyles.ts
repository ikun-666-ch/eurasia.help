import { Link } from "react-router";
import styled from "styled-components";

export const Page = styled.div`
  min-height: 100vh;
  padding: 24px 20px 48px;
  background: radial-gradient(ellipse at 50% 0%, #132040 0%, #070b14 55%, #050810 100%);
  color: #e8f0ff;
  font-family: system-ui, -apple-system, "PingFang SC", sans-serif;
`;

export const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 560px;
  margin: 0 auto 24px;
`;

export const BackLink = styled(Link)`
  color: #7dd3fc;
  text-decoration: none;
  font-size: 14px;
  white-space: nowrap;
  &:hover {
    color: #bae6fd;
  }
`;

export const Title = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: center;
`;

export const Card = styled.section`
  max-width: 560px;
  margin: 0 auto 20px;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(48, 97, 219, 0.35);
  background: rgba(12, 20, 40, 0.85);
`;

export const CardTitle = styled.h2`
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: rgba(186, 206, 255, 0.9);
`;

export const MenuList = styled.div`
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const MenuBtn = styled(Link)<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid
    ${(p) => (p.$danger ? "rgba(248, 113, 113, 0.35)" : "rgba(48, 97, 219, 0.35)")};
  background: ${(p) =>
    p.$danger ? "rgba(127, 29, 29, 0.25)" : "rgba(12, 20, 40, 0.85)"};
  color: ${(p) => (p.$danger ? "#fecaca" : "#e8f0ff")};
  text-decoration: none;
  font-size: 15px;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    background: ${(p) =>
      p.$danger ? "rgba(127, 29, 29, 0.4)" : "rgba(48, 97, 219, 0.2)"};
    border-color: ${(p) =>
      p.$danger ? "rgba(248, 113, 113, 0.55)" : "rgba(48, 97, 219, 0.55)"};
  }

  span:last-child {
    color: rgba(186, 206, 255, 0.45);
    font-size: 18px;
  }
`;

export const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(48, 97, 219, 0.15);
  font-size: 14px;

  &:last-child {
    border-bottom: none;
  }

  span:first-child {
    color: rgba(186, 206, 255, 0.65);
  }
`;

export const Field = styled.label`
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  color: rgba(186, 206, 255, 0.75);

  input {
    display: block;
    width: 100%;
    margin-top: 6px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(48, 97, 219, 0.45);
    background: rgba(8, 14, 28, 0.95);
    color: #e8f0ff;
    font: inherit;
    box-sizing: border-box;
    outline: none;
  }
`;

export const CodeRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 6px;

  input {
    flex: 1;
    margin-top: 0;
  }
`;

export const BtnSendCode = styled.button`
  flex-shrink: 0;
  min-width: 108px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(48, 97, 219, 0.55);
  background: rgba(48, 97, 219, 0.15);
  color: #bdcfff;
  font: inherit;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const BtnPrimary = styled.button`
  margin-top: 4px;
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #3061db;
  color: #fff;
  font: inherit;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const BtnDanger = styled(BtnPrimary)`
  width: 100%;
  margin-top: 0;
  background: rgba(220, 38, 38, 0.85);
`;

export const BtnGhost = styled.button`
  width: 100%;
  margin-top: 12px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid rgba(48, 97, 219, 0.35);
  background: transparent;
  color: rgba(186, 206, 255, 0.85);
  font: inherit;
  cursor: pointer;
`;

export const Msg = styled.p<{ $error?: boolean }>`
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  background: ${(p) => (p.$error ? "rgba(127, 29, 29, 0.45)" : "rgba(34, 197, 94, 0.15)")};
  color: ${(p) => (p.$error ? "#fecaca" : "#86efac")};
  border: 1px solid ${(p) => (p.$error ? "rgba(248, 113, 113, 0.35)" : "rgba(34, 197, 94, 0.35)")};
`;

export const Hint = styled.p`
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(186, 206, 255, 0.65);
`;

export const TextLink = styled(Link)`
  display: inline-block;
  margin-top: 16px;
  color: #7dd3fc;
  font-size: 14px;
  text-decoration: none;

  &:hover {
    color: #bae6fd;
  }
`;
