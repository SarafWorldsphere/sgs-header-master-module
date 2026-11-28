
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const getSchoolDetails = async () => {
  const response = await api.get("/school");
  return response.data;
};

export default api;
