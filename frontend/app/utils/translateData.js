export async function bulkTranslate({
  api,
  items,
  field,
  language,
  headmaster,
}) {

  if (!items || items.length === 0) {
    return items;
  }

  try {

    const texts = items
      .map((item) => item[field])
      .filter(Boolean);


    if (texts.length === 0) {
      return items;
    }


    const response = await api.post(
      "/headmaster/translate",
      {
        text: texts,
        target_language: language,
        user_info: {
          name: headmaster?.name || "Headmaster",
          email: headmaster?.email || "",
          role: "Headmaster",
        },
      }
    );


    const translated = response.data?.translated || [];

    let index = 0;


    return items.map((item) => {

      if (item[field]) {

        return {
          ...item,
          [field]: translated[index++] || item[field],
        };

      }

      return item;

    });


  } catch (error) {

    console.error(
      "Bulk translation error:",
      error
    );

    return items;

  }

}