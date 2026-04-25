(function () {
	/**
	 * @param {File} file
	 */
	function fileTypeLabel(file) {
		const t = (file.type || "").trim();
		if (t) {
			return t;
		}
		const m = file.name.match(/\.([a-z0-9]+)$/i);
		if (m) {
			return "." + m[1].toLowerCase() + " (MIME 자동 감지 없음)";
		}
		return "알 수 없음";
	}

	/**
	 * @param {HTMLElement} section
	 * @param {{ url: string, part: string, kind: "image" | "video" }} cfg
	 */
	function initUploadPanel(section, cfg) {
		const fileInput = section.querySelector("[data-file-input]");
		const maxFiles = parseInt(fileInput?.dataset.maxFiles || "10", 10) || 10;
		const dropzone = section.querySelector("[data-dropzone]");
		const pickedOut = section.querySelector("[data-picked-outlet]");
		const clearBtn = section.querySelector("[data-clear-files]");
		const outBox = section.querySelector("[data-api-out]");
		const outJson = section.querySelector("[data-api-json]");
		const errBox = section.querySelector("[data-api-err]");
		const memo = section.querySelector("[data-memo]");
		const sendBtn = section.querySelector("[data-send]");
		const apiForm = section.querySelector("[data-api-form]");

		/** @type {File[]} */
		let pickedFiles = [];
		const emptyText =
			cfg.kind === "image" ? "아직 첨부한 이미지가 없어요." : "아직 첨부한 동영상이 없어요.";

		function isAllowedFile(file) {
			const t = (file.type || "").toLowerCase();
			if (cfg.kind === "image") {
				if (t.startsWith("image/")) {
					return true;
				}
				if (!t) {
					return /\.(jpe?g|png|gif|webp|bmp|svg|tiff?|heic|heif|jxl|ico)$/i.test(file.name);
				}
				return false;
			}
			if (t.startsWith("video/")) {
				return true;
			}
			if (!t) {
				return /\.(mp4|m4v|webm|mov|ogv|ogg|avi|mkv|3gp|wmv)$/i.test(file.name);
			}
			return false;
		}

		const localCode = {
			empty: cfg.kind === "image" ? "LOCAL_NO_IMAGES" : "LOCAL_NO_VIDEOS",
			wrong: cfg.kind === "image" ? "LOCAL_NOT_IMAGE" : "LOCAL_NOT_VIDEO",
		};

		/** @param {string | null} code */
		function setApiErrorCode(code) {
			if (!errBox) {
				return;
			}
			if (code) {
				errBox.hidden = false;
				errBox.textContent = "";
				errBox.dataset.code = code;
			} else {
				errBox.hidden = true;
				errBox.textContent = "";
				delete errBox.dataset.code;
			}
		}

		function setOut(data) {
			if (!outBox || !outJson) {
				return;
			}
			outBox.hidden = false;
			outJson.textContent = JSON.stringify(data, null, 2);
			outBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
		}

		/**
		 * UI는 항상 `pickedFiles`를 그립니다. (fileInput에 DataTransfer 할당이 실패하는 브라우저 대응)
		 * @param {File[]} files
		 */
		function renderPickedList(files) {
			if (!pickedOut) {
				return;
			}
			const list = (files || []).slice(0, maxFiles);
			pickedOut.classList.toggle("is-populated", list.length > 0);
			if (list.length === 0) {
				const p = document.createElement("p");
				p.className = "dropzone__empty";
				p.textContent = emptyText;
				pickedOut.replaceChildren(p);
				return;
			}
			const ul = document.createElement("ul");
			ul.className = "file-list";
			list.forEach((file) => {
				const li = document.createElement("li");
				li.className = "file-list__item";
				const name = document.createElement("span");
				name.className = "file-list__name";
				name.textContent = file.name;
				name.title = file.name;
				const type = document.createElement("span");
				type.className = "file-list__type";
				type.textContent = fileTypeLabel(file);
				li.appendChild(name);
				li.appendChild(type);
				ul.appendChild(li);
			});
			pickedOut.replaceChildren(ul);
		}

		/** @returns {File[]} */
		function filesToSend() {
			return pickedFiles.filter((f) => f.size > 0 && isAllowedFile(f));
		}

		/**
		 * @param {FileList|File[]} fileList0
		 * @param {{ forceWrong?: boolean }} [opt]
		 */
		function commitPickedFiles(fileList0, opt) {
			const raw = Array.from(fileList0 || []);
			const valid = raw.filter((f) => isAllowedFile(f));
			const hadInvalid = raw.some((f) => !isAllowedFile(f));
			const forceWrong = opt && opt.forceWrong;

			if (valid.length === 0) {
				if (raw.length > 0) {
					setApiErrorCode(localCode.wrong);
				} else {
					setApiErrorCode(null);
				}
				pickedFiles = [];
				if (fileInput) {
					fileInput.value = "";
				}
				renderPickedList([]);
				if (outBox) {
					outBox.hidden = true;
				}
				return;
			}

			const next = valid.slice(0, maxFiles);
			pickedFiles = next;
			if (fileInput) {
				try {
					const dt = new DataTransfer();
					next.forEach((f) => dt.add(f));
					fileInput.files = dt.files;
				} catch {
					// Safari 일부: input.files에 DataTransfer 부여 불가 — pickedFiles·FormData로 전송; input은 건드리지 않음(동일 파일 재선택 이슈 방지)
				}
			}

			if (hadInvalid || forceWrong) {
				setApiErrorCode(localCode.wrong);
			} else {
				setApiErrorCode(null);
			}
			if (outBox) {
				outBox.hidden = true;
			}
			renderPickedList(pickedFiles);
		}

		renderPickedList([]);

		if (fileInput) {
			fileInput.addEventListener("change", () => {
				commitPickedFiles(fileInput.files);
			});
		}

		if (dropzone && fileInput) {
			["dragenter", "dragover"].forEach((ev) => {
				dropzone.addEventListener(ev, (e) => {
					e.preventDefault();
					e.stopPropagation();
					dropzone.setAttribute("data-drag", "1");
				});
			});
			["dragleave", "drop"].forEach((ev) => {
				dropzone.addEventListener(ev, (e) => {
					e.preventDefault();
					e.stopPropagation();
					dropzone.setAttribute("data-drag", "0");
				});
			});
			dropzone.addEventListener("drop", (e) => {
				const dt0 = e.dataTransfer;
				if (!dt0 || !dt0.files || dt0.files.length === 0) {
					return;
				}
				const fromDrop = Array.from(dt0.files);
				const incoming = fromDrop.filter(isAllowedFile);
				if (incoming.length === 0) {
					setApiErrorCode(localCode.wrong);
					return;
				}
				const hasWrong = fromDrop.some((f) => !isAllowedFile(f));
				const existing = pickedFiles;
				const combined = [...existing, ...incoming].filter(isAllowedFile).slice(0, maxFiles);
				const merged = new DataTransfer();
				combined.forEach((f) => merged.add(f));
				commitPickedFiles(merged.files, { forceWrong: hasWrong });
			});
			dropzone.addEventListener("click", (e) => {
				if (e.target && e.target.closest("label[for], .dropzone__input")) {
					return;
				}
				if (e.target && e.target.closest("button, .btn")) {
					return;
				}
				if (e.target && e.target.closest(".file-list .file-list__item")) {
					return;
				}
				fileInput.click();
			});
			dropzone.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					fileInput.click();
				}
			});
		}

		if (clearBtn && fileInput) {
			clearBtn.addEventListener("click", () => {
				pickedFiles = [];
				fileInput.value = "";
				renderPickedList([]);
				if (outBox) {
					outBox.hidden = true;
				}
				setApiErrorCode(null);
			});
		}

		if (apiForm && fileInput) {
			apiForm.addEventListener("submit", async (e) => {
				e.preventDefault();
				setApiErrorCode(null);
				const files = filesToSend();
				if (files.length < 1) {
					setApiErrorCode(localCode.empty);
					if (outBox) {
						outBox.hidden = true;
					}
					return;
				}

				const body = new FormData();
				const itemRaw = memo && memo.value != null ? String(memo.value) : "";
				const itemTrim = itemRaw.trim();
				if (itemTrim.length > 0) {
					body.append("item", itemTrim);
				}
				files.forEach((f) => body.append(cfg.part, f));

				if (sendBtn) {
					sendBtn.disabled = true;
				}
				const oldHtml = sendBtn && sendBtn.innerHTML;
				if (sendBtn) {
					sendBtn.textContent = "…";
				}

				try {
					const res = await fetch(cfg.url, {
						method: "POST",
						body,
						credentials: "same-origin",
						headers: { Accept: "application/json" },
					});
					const text = await res.text();
					let data;
					try {
						data = text ? JSON.parse(text) : {};
					} catch {
						data = { _parse: true, _body: text };
					}
					if (!res.ok) {
						const code = (data && data.code) || "HTTP_" + res.status;
						setApiErrorCode(String(code));
						if (outBox) {
							outBox.hidden = true;
						}
						return;
					}
					setOut(data);
					renderPickedList(pickedFiles);
				} catch {
					setApiErrorCode("NETWORK");
					if (outBox) {
						outBox.hidden = true;
					}
				} finally {
					if (sendBtn) {
						sendBtn.disabled = false;
						if (oldHtml) {
							sendBtn.innerHTML = oldHtml;
						}
					}
				}
			});
		}
	}

	const panels = document.querySelectorAll("[data-upload-panel]");
	panels.forEach((section) => {
		const k = section.getAttribute("data-upload-panel");
		if (k === "image") {
			initUploadPanel(section, { url: "/api/guess", part: "images", kind: "image" });
		} else if (k === "video") {
			initUploadPanel(section, { url: "/api/guess/video", part: "videos", kind: "video" });
		}
	});
})();
