import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("URL / share ingest", () => {
  it("pre-fills ?text= and auto-runs mock routing without executing", async () => {
    window.history.replaceState(
      {},
      "",
      "/?text=Service%20failed%3A%20connection%20refused%20on%20the%20database%20socket.",
    );
    render(<App />);

    const field = screen.getByLabelText("Paste field");
    expect(field).toHaveValue("Service failed: connection refused on the database socket.");
    expect(screen.getByText("Opened from Share. Nothing runs until you confirm.")).toBeInTheDocument();

    const actions = await screen.findByLabelText("Suggested actions");
    const buttons = within(actions).getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.length).toBeLessThanOrEqual(3);
    expect(within(actions).getByRole("button", { name: "Open log viewer" })).toBeInTheDocument();
    expect(screen.queryByText(/Prepared/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Action preview")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Local preview")).not.toBeInTheDocument();
  });

  it("accepts ?q= the same way", async () => {
    window.history.replaceState({}, "", "/?q=An%20app%20that%20lets%20me%20assemble%20virtual%20model%20kits.");
    render(<App />);
    expect(screen.getByLabelText("Paste field")).toHaveValue(
      "An app that lets me assemble virtual model kits.",
    );
    expect(await screen.findByRole("button", { name: "Save idea" })).toBeInTheDocument();
  });

  it("still requires preview then Confirm after share ingest", async () => {
    window.history.replaceState({}, "", "/?text=Lass%20uns%20morgen%20%C3%BCber%20das%20Projekt%20sprechen.");
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Draft event" }));
    const preview = screen.getByLabelText("Action preview");
    expect(preview).toHaveTextContent(/Nothing is sent, scheduled/);
    expect(screen.queryByText(/Prepared/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Prepared/);
    expect(screen.getByLabelText("Local preview")).toHaveTextContent(/No email, calendar, or external API/);
  });

  it("keeps MS2 failure flags when share text is also present", async () => {
    window.history.replaceState(
      {},
      "",
      "/?scenario=timeout&text=Service%20failed%3A%20connection%20refused%20on%20the%20database%20socket.",
    );
    render(<App />);
    expect(
      await screen.findByText("Couldn't decide in time.", {}, { timeout: 2000 }),
    ).toBeInTheDocument();
    const field = screen.getByLabelText("Paste field");
    expect(field).toHaveValue("Service failed: connection refused on the database socket.");
    expect(field).not.toBeDisabled();
    expect(screen.getByText("Pick a safe tool instead:")).toBeInTheDocument();
  });
});
