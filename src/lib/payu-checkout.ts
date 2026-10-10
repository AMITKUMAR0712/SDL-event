"use client";

export function submitPayUCheckout(url: string, fields: Record<string, string>): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  form.target = "_self";
  form.hidden = true;

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  try {
    form.submit();
  } catch (error) {
    form.remove();
    throw error;
  }
}
