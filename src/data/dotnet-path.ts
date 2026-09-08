import { curriculum } from "./curriculum";

export const DOTNET_TRACK = "C# & .NET";
export const dotnetDecks = curriculum.filter((deck) => deck.track === DOTNET_TRACK);
export const dotnetStages = [
  {
    title: "Get comfortable with C#",
    description: "Read the code, model your data, and understand what happens while your app waits.",
    decks: dotnetDecks.slice(0, 4),
  },
  {
    title: "Build your web backend",
    description: "Turn a request into a useful response, save data, and check who can access it.",
    decks: dotnetDecks.slice(4, 8),
  },
  {
    title: "Finish a working web app",
    description: "Choose a UI, test real behavior, and bring the pieces together in a notes app.",
    decks: dotnetDecks.slice(8, 12),
  },
];

export function dotnetStudyUrl(minutes: 2 | 5 | 10 = 5) {
  return `/study?${new URLSearchParams({ track: DOTNET_TRACK, minutes: String(minutes) })}`;
}
