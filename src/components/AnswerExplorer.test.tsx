import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AnswerExplorer } from "./AnswerExplorer";
import { teachingMarker } from "../teaching/answers";

const back = `${teachingMarker}\n\n## Plain English\n\nFirst explanation.\n\n## An analogy\n\nThink of a ticket.\n\n## Try it\n\nWhat is two plus three?\n\n<!-- recall:solution -->\n\nThe solution is five.`;

describe("AnswerExplorer", () => {
  it("navigates both ways and keeps practice solutions hidden until requested", async () => {
    const user = userEvent.setup();
    render(<AnswerExplorer front="Question" back={back} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next explanation" }));
    expect(
      screen.getByRole("heading", { name: "An analogy" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("First explanation.")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Explanation style"), "2");
    expect(screen.getByText("What is two plus three?")).toBeInTheDocument();
    expect(screen.queryByText("The solution is five.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(screen.getByText("The solution is five.")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Back to first explanation" }),
    );
    await user.selectOptions(screen.getByLabelText("Explanation style"), "2");
    expect(screen.queryByText("The solution is five.")).not.toBeInTheDocument();
  });

  it("starts from the first explanation for another question or an edited answer", async () => {
    const user = userEvent.setup();
    const view = render(<AnswerExplorer front="First question" back={back} />);
    await user.click(screen.getByRole("button", { name: "Next explanation" }));
    view.rerender(<AnswerExplorer front="Second question" back={back} />);
    expect(screen.getByLabelText("Explanation style")).toHaveValue("0");
    await user.selectOptions(screen.getByLabelText("Explanation style"), "2");
    view.rerender(
      <AnswerExplorer
        front="Second question"
        back={`${teachingMarker}\n\n## Updated\n\nOne edited answer.`}
      />,
    );
    expect(screen.getByText("One edited answer.")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Explanation style"),
    ).not.toBeInTheDocument();
  });
});
