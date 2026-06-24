import styled from "styled-components";

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #cbd5e1;

  span {
    font-size: 11px;
    color: #94a3b8;
  }

  input,
  select,
  textarea {
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid rgba(100, 116, 139, 0.45);
    background: rgba(15, 23, 42, 0.8);
    color: #f1f5f9;
    font-size: 13px;
  }

  textarea {
    min-height: 72px;
    resize: vertical;
    font-family: ui-monospace, monospace;
  }
`;

export const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

export const MiniBtn = styled.button`
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.4);
  background: rgba(14, 116, 144, 0.2);
  color: #7dd3fc;
  font-size: 12px;
  cursor: pointer;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    padding: 6px 8px;
    border-bottom: 1px solid rgba(51, 65, 85, 0.6);
    text-align: left;
  }

  th {
    color: #94a3b8;
    font-weight: 500;
  }

  input,
  select {
    width: 100%;
    padding: 4px 6px;
    border-radius: 4px;
    border: 1px solid rgba(100, 116, 139, 0.45);
    background: rgba(15, 23, 42, 0.8);
    color: #f1f5f9;
    font-size: 12px;
  }
`;

export const Hint = styled.p`
  margin: 0 0 8px;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
`;
