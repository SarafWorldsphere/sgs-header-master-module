export async function translateActiveTab({
  activeTab,
  language,
  bulkTranslate,

  originalTeachers,
  setTeachers,

  originalProgressData,
  setProgressData,

  originalNotifications,
  setNotifications,

  originalFunctionsData,
  setFunctionsData,

  originalToursData,
  setToursData,

  originalClassTeachers,
  setClassTeachers,
}) {

  // ================= ENGLISH =================
  if (language === "English") {

    if (activeTab === "teachers")
      return setTeachers(originalTeachers);

    if (activeTab === "progress")
      return setProgressData(originalProgressData);

    if (activeTab === "notifications")
      return setNotifications(originalNotifications);

    if (activeTab === "functions")
      return setFunctionsData(originalFunctionsData);

    if (activeTab === "tours")
      return setToursData(originalToursData);

    if (activeTab === "classTeachers")
      return setClassTeachers(originalClassTeachers);

    return;
  }

  try {

    // ================= TEACHERS =================
    if (activeTab === "teachers" && originalTeachers.length > 0) {

      let data = await bulkTranslate(
        originalTeachers,
        "full_name",
        language
      );

      data = await bulkTranslate(
        data,
        "subject_name",
        language
      );

      setTeachers(data);
      return;
    }

    // ================= PROGRESS =================
    if (activeTab === "progress" && originalProgressData.length > 0) {

      let data = await bulkTranslate(
        originalProgressData,
        "subject_name",
        language
      );

      data = await bulkTranslate(
        data,
        "remarks",
        language
      );

      setProgressData(data);
      return;
    }

    // ================= NOTIFICATIONS =================
    if (activeTab === "notifications" && originalNotifications.length > 0) {

      let data = await bulkTranslate(
        originalNotifications,
        "notice_title",
        language
      );

      data = await bulkTranslate(
        data,
        "notice_text",
        language
      );

      setNotifications(data);
      return;
    }

    // ================= FUNCTIONS =================
    if (activeTab === "functions" && originalFunctionsData.length > 0) {

      let data = await bulkTranslate(
        originalFunctionsData,
        "function_name",
        language
      );

      data = await bulkTranslate(
        data,
        "description",
        language
      );

      setFunctionsData(data);
      return;
    }

    // ================= TOURS =================
    if (activeTab === "tours" && originalToursData.length > 0) {

      let data = await bulkTranslate(
        originalToursData,
        "tour_name",
        language
      );

      data = await bulkTranslate(
        data,
        "destination",
        language
      );

      setToursData(data);
      return;
    }

    // ================= CLASS TEACHERS =================
    if (
      activeTab === "classTeachers" &&
      originalClassTeachers.length > 0
    ) {

      const data = await bulkTranslate(
        originalClassTeachers,
        "teacher_name",
        language
      );

      setClassTeachers(data);
    }

  } catch (error) {

    console.error("Translation Error:", error);

  }
}