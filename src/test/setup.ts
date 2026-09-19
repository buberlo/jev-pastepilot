import "@testing-library/jest-dom/vitest";
import { setJevProviderOverride } from "../domain/providers";
import { createJevAdapter } from "../server/jevAdapter";

setJevProviderOverride(createJevAdapter());
