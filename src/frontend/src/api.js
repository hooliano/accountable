import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

export function errorMessage(error) {
  return error.response?.data?.error || "Could not connect. Please try again.";
}

export function dueLabel(date) {
  if (!date) {
    return "No due date";
  }

  return new Date(date).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
