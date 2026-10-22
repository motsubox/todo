(() => {
  "use strict";

  const STORAGE_KEY = "todo-app.v1";
  const FILTERS = {
    all: () => true,
    active: (todo) => !todo.done,
    done: (todo) => todo.done,
  };
  const EMPTY_MESSAGES = {
    all: "タスクはまだありません。上の入力欄から追加しましょう。",
    active: "未完了のタスクはありません 🎉",
    done: "完了したタスクはありません。",
  };

  const $ = (id) => document.getElementById(id);
  const form = $("new-todo-form");
  const input = $("new-todo-input");
  const list = $("todo-list");
  const empty = $("empty");
  const summary = $("summary");
  const remaining = $("remaining");
  const toolbar = $("toolbar");
  const footer = $("footer");
  const toggleAll = $("toggle-all");
  const clearDone = $("clear-done");
  const filterButtons = document.querySelectorAll("[data-filter]");
  const itemTemplate = $("todo-item-template");

  let todos = load();
  let filter = "all";
  let editingId = null;

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch {
      // ストレージが使えない環境（プライベートモード等）ではメモリ上のみで動作する
    }
  }

  function newId() {
    if (window.crypto && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function update(nextTodos) {
    todos = nextTodos;
    save();
    render();
  }

  function addTodo(text) {
    update([...todos, { id: newId(), text, done: false, createdAt: Date.now() }]);
  }

  function toggleTodo(id) {
    update(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function editTodo(id, text) {
    // 空にした場合は削除として扱う
    if (!text) {
      removeTodo(id);
      return;
    }
    update(todos.map((t) => (t.id === id ? { ...t, text } : t)));
  }

  function removeTodo(id) {
    update(todos.filter((t) => t.id !== id));
  }

  function render() {
    const visible = todos.filter(FILTERS[filter]);
    const doneCount = todos.filter((t) => t.done).length;
    const activeCount = todos.length - doneCount;

    list.replaceChildren(...visible.map(renderItem));

    empty.textContent = visible.length === 0 ? EMPTY_MESSAGES[filter] : "";
    summary.textContent = todos.length ? `${doneCount} / ${todos.length} 完了` : "";
    remaining.textContent = `残り ${activeCount} 件`;

    const hasTodos = todos.length > 0;
    toolbar.hidden = !hasTodos;
    footer.hidden = !hasTodos;
    clearDone.hidden = doneCount === 0;
    toggleAll.checked = hasTodos && activeCount === 0;

    filterButtons.forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.filter === filter));
    });
  }

  function renderItem(todo) {
    const li = itemTemplate.content.firstElementChild.cloneNode(true);
    li.dataset.id = todo.id;
    li.classList.toggle("is-done", todo.done);

    const check = li.querySelector(".todo-check");
    check.checked = todo.done;
    check.setAttribute("aria-label", `「${todo.text}」を完了にする`);

    li.querySelector(".todo-text").textContent = todo.text;
    li.querySelector(".todo-delete").setAttribute("aria-label", `「${todo.text}」を削除`);
    return li;
  }

  function startEdit(li) {
    const todo = todos.find((t) => t.id === li.dataset.id);
    if (!todo) return;
    editingId = todo.id;

    const field = document.createElement("input");
    field.type = "text";
    field.className = "todo-edit";
    field.value = todo.text;
    field.maxLength = 200;
    field.setAttribute("aria-label", "タスクを編集");

    li.querySelector(".todo-text").replaceWith(field);
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);

    field.addEventListener("keydown", (e) => {
      if (e.isComposing) return; // IME 変換確定の Enter は無視
      if (e.key === "Enter") finishEdit(field.value);
      if (e.key === "Escape") finishEdit(null);
    });
    field.addEventListener("blur", () => finishEdit(field.value));
  }

  // value が null のときは編集をキャンセルする
  function finishEdit(value) {
    if (editingId === null) return;
    const id = editingId;
    editingId = null;
    if (value === null) {
      render();
    } else {
      editTodo(id, value.trim());
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addTodo(text);
    input.value = "";
    input.focus();
  });

  list.addEventListener("change", (e) => {
    if (!e.target.matches(".todo-check")) return;
    toggleTodo(e.target.closest(".todo-item").dataset.id);
  });

  list.addEventListener("click", (e) => {
    if (!e.target.matches(".todo-delete")) return;
    removeTodo(e.target.closest(".todo-item").dataset.id);
  });

  list.addEventListener("dblclick", (e) => {
    if (!e.target.matches(".todo-text")) return;
    startEdit(e.target.closest(".todo-item"));
  });

  toggleAll.addEventListener("change", () => {
    const done = toggleAll.checked;
    update(todos.map((t) => ({ ...t, done })));
  });

  clearDone.addEventListener("click", () => {
    update(todos.filter((t) => !t.done));
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      render();
    });
  });

  // 別タブでの変更を反映する
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    todos = load();
    render();
  });

  render();
})();
