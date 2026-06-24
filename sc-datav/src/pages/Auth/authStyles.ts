import styled from "styled-components";

/* 基于 https://codepen.io/hexagoncircle/pen/XWJGQqy */
export const Page = styled.div`
  --space-root: 1rem;
  --space-xs: calc(var(--space-root) / 2);
  --space-s: calc(var(--space-root) / 1.5);
  --space-m: var(--space-root);
  --space-l: calc(var(--space-root) * 1.5);
  --space-xl: calc(var(--space-root) * 2);
  --color-primary: mediumslateblue;
  --color-secondary: black;
  --color-tertiary: hotpink;
  --base-border-radius: 0.25rem;
  --ease: cubic-bezier(0.075, 0.82, 0.165, 1);
  --duration: 350ms;
  --font-size: 1.25rem;

  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: var(--space-m);
  font-size: var(--font-size);
  font-family: "Roboto", "Segoe UI", sans-serif;
  line-height: 1.2;
  background-color: var(--color-tertiary);
`;

export const Form = styled.form`
  position: relative;
  width: 100%;
  max-width: 450px;
  margin: 0 auto;
  transform: skewY(-5deg) translateY(10%) scale(0.94);
  transition:
    box-shadow var(--duration) var(--ease),
    transform var(--duration) var(--ease);

  &::before,
  &::after {
    content: "";
    position: absolute;
    pointer-events: none;
    background-color: #ebebeb;
    width: 25%;
    height: 100%;
    transition:
      background-color var(--duration) var(--ease),
      transform var(--duration) var(--ease);
  }

  &::before {
    top: 0;
    right: calc(100% - 1px);
    transform-origin: 100% 100%;
    transform: skewY(-35deg) scaleX(-1);
    z-index: -1;
  }

  &::after {
    top: 0;
    left: calc(100% - 1px);
    transform-origin: 0 0;
    transform: skewY(-35deg) scaleX(-1);
    z-index: 2;
  }

  &:hover,
  &:focus-within {
    transform: scale(1.0001);
    box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.1);
  }

  &:hover::before,
  &:hover::after,
  &:focus-within::before,
  &:focus-within::after {
    background-color: white;
    transform: skewY(0);
  }
`;

export const FormInner = styled.div`
  padding: var(--space-xl);
  background-color: white;
  z-index: 1;
  position: relative;
`;

export const Header = styled.div`
  margin-bottom: var(--space-xl);
`;

export const Title = styled.h2`
  margin: 0 0 var(--space-m);
  font-weight: 700;
  font-size: calc(var(--font-size) * 1.5);
  color: var(--color-secondary);
`;

export const Subtitle = styled.p`
  margin: 0;
  font-size: calc(var(--font-size) / 1.5);
  color: rgba(0, 0, 0, 0.55);
`;

export const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-l);
`;

export const InputWrapper = styled.div`
  &:focus-within label {
    color: var(--color-secondary);
  }

  &:focus-within .auth-icon {
    background-color: var(--color-secondary);
    border-color: var(--color-secondary);
  }

  &:focus-within input,
  &:focus-within select {
    border-color: var(--color-secondary);
  }
`;

export const Label = styled.label`
  font-size: calc(var(--font-size) / 1.65);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.065rem;
  display: block;
  margin-bottom: var(--space-xs);
  color: var(--color-primary);
`;

export const InputGroup = styled.div`
  display: flex;
  align-items: stretch;
`;

export const Icon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0 var(--space-m);
  min-width: 52px;
  background-color: var(--color-primary);
  border: 2px solid var(--color-primary);
  border-right: none;
  border-radius: var(--base-border-radius) 0 0 var(--base-border-radius);
  pointer-events: none;
  transition: background-color var(--duration) var(--ease);

  svg {
    width: 1.25em;
    height: 1.25em;
    fill: white;
  }
`;

export const Input = styled.input`
  flex: 1;
  min-width: 0;
  outline: none;
  padding: var(--space-m);
  font-size: var(--font-size);
  font-family: inherit;
  color: var(--color-secondary);
  border: 2px solid var(--color-primary);
  border-radius: 0 var(--base-border-radius) var(--base-border-radius) 0;
  box-sizing: border-box;
  transition: border-color var(--duration) var(--ease);

  &:focus {
    color: var(--color-primary);
  }
`;

export const AuthSelect = styled.select`
  flex: 1;
  min-width: 0;
  outline: none;
  padding: var(--space-m);
  font-size: var(--font-size);
  font-family: inherit;
  color: var(--color-secondary);
  border: 2px solid var(--color-primary);
  border-radius: 0 var(--base-border-radius) var(--base-border-radius) 0;
  box-sizing: border-box;
  background: white;
  cursor: pointer;
  transition: border-color var(--duration) var(--ease);

  &:focus {
    color: var(--color-primary);
  }
`;

export const CodeRow = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: stretch;
`;

export const CodeInput = styled(Input)`
  flex: 1;
  min-width: 0;
  padding: var(--space-m) 8px;
  border-radius: 0;
  border-right: none;
`;

export const BtnSendCode = styled.button`
  flex-shrink: 0;
  width: 92px;
  padding: 0 6px;
  font-size: calc(var(--font-size) / 1.9);
  font-weight: 600;
  line-height: 1.2;
  border: 2px solid var(--color-primary);
  border-radius: 0 var(--base-border-radius) var(--base-border-radius) 0;
  background: white;
  color: var(--color-primary);
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const BtnGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-xl);
  gap: var(--space-s);
  flex-wrap: wrap;
`;

export const BtnPrimary = styled.button`
  font-size: calc(var(--font-size) / 1.65);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.065rem;
  background-color: var(--color-primary);
  border: 2px solid var(--color-primary);
  color: white;
  outline: none;
  padding: var(--space-m) var(--space-l);
  border-radius: var(--base-border-radius);
  cursor: pointer;
  white-space: nowrap;

  &:focus {
    background-color: var(--color-secondary);
    border-color: var(--color-secondary);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const BtnText = styled.button`
  font-size: calc(var(--font-size) / 1.5);
  padding: 0;
  border: none;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  white-space: nowrap;

  &:focus {
    color: var(--color-secondary);
  }
`;

export const ErrorMsg = styled.p`
  margin: 0 0 var(--space-l);
  padding: var(--space-s);
  font-size: calc(var(--font-size) / 1.5);
  color: #c62828;
  background: #ffebee;
  border-left: 3px solid #e53935;
`;
