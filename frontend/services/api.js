import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const getStudentAnalysis = async (studentId) => {
  const response = await api.get(`/llm/student-analysis/${studentId}`);
  return response.data;
};

export const getOverallAnalysis = async () => {
  const response = await api.get("/llm/overall-analysis");
  return response.data;
};
