/**
 * Ceylon Journey - Universal Custom Dropdown Component
 * Replaces native browser select menus with a unified, eye-pleasing custom dropdown UI
 */

(function() {
  function initCustomSelect(select) {
    if (!select || select.dataset.customized === 'true') return;
    select.dataset.customized = 'true';

    // Determine visual variant
    const isPill = Boolean(select.closest('.sort-select-wrapper') || select.closest('.admin-cat-filter-wrap') || select.classList.contains('is-pill'));
    const isSmall = Boolean(select.id === 'field-difficulty' || select.classList.contains('is-small'));
    const isFormControl = Boolean(select.classList.contains('form-control') && !isSmall);

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper' +
      (isPill ? ' is-pill' : '') +
      (isFormControl ? ' is-form-control' : '') +
      (isSmall ? ' is-small' : '');

    // Move select into wrapper
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add('custom-select-native');

    // Create trigger button
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const valueSpan = document.createElement('span');
    valueSpan.className = 'custom-select-value';

    const arrowSpan = document.createElement('span');
    arrowSpan.className = 'custom-select-arrow';
    arrowSpan.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;

    trigger.appendChild(valueSpan);
    trigger.appendChild(arrowSpan);
    wrapper.appendChild(trigger);

    // Create dropdown menu
    const menu = document.createElement('div');
    menu.className = 'custom-select-menu';
    menu.setAttribute('role', 'listbox');
    wrapper.appendChild(menu);

    function buildOptions() {
      menu.innerHTML = '';
      const options = Array.from(select.options);
      const selectedIndex = select.selectedIndex >= 0 ? select.selectedIndex : 0;
      const selectedOption = options[selectedIndex];

      valueSpan.textContent = selectedOption ? selectedOption.text : 'Select...';

      options.forEach((opt, idx) => {
        const optionEl = document.createElement('div');
        optionEl.className = 'custom-select-option' + (idx === selectedIndex ? ' is-selected' : '');
        optionEl.setAttribute('role', 'option');
        optionEl.setAttribute('aria-selected', idx === selectedIndex ? 'true' : 'false');
        optionEl.dataset.value = opt.value;

        const textSpan = document.createElement('span');
        textSpan.textContent = opt.text;

        const checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        checkSvg.setAttribute('class', 'option-check');
        checkSvg.setAttribute('width', '14');
        checkSvg.setAttribute('height', '14');
        checkSvg.setAttribute('viewBox', '0 0 24 24');
        checkSvg.setAttribute('fill', 'none');
        checkSvg.setAttribute('stroke', 'currentColor');
        checkSvg.setAttribute('stroke-width', '2.8');
        checkSvg.setAttribute('stroke-linecap', 'round');
        checkSvg.setAttribute('stroke-linejoin', 'round');
        checkSvg.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';

        optionEl.appendChild(textSpan);
        optionEl.appendChild(checkSvg);

        optionEl.addEventListener('click', (e) => {
          e.stopPropagation();
          selectOption(opt.value);
          closeDropdown();
          trigger.focus();
        });

        menu.appendChild(optionEl);
      });
    }

    function selectOption(value) {
      if (select.value === value) {
        updateUI();
        return;
      }
      select.value = value;
      updateUI();
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function updateUI() {
      const selectedIndex = select.selectedIndex >= 0 ? select.selectedIndex : 0;
      const selectedOption = select.options[selectedIndex];
      if (selectedOption) {
        valueSpan.textContent = selectedOption.text;
      }

      Array.from(menu.children).forEach((child, idx) => {
        const isMatch = idx === selectedIndex;
        child.classList.toggle('is-selected', isMatch);
        child.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      });

      if (select.disabled) {
        wrapper.classList.add('is-disabled');
        trigger.disabled = true;
      } else {
        wrapper.classList.remove('is-disabled');
        trigger.disabled = false;
      }
    }

    function openDropdown() {
      closeAllCustomSelects();

      wrapper.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');

      // Check overflow bottom
      const rect = menu.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      if (rect.bottom > windowHeight && rect.top > rect.height) {
        wrapper.classList.add('open-upward');
      } else {
        wrapper.classList.remove('open-upward');
      }
    }

    function closeDropdown() {
      wrapper.classList.remove('is-open', 'open-upward');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (wrapper.classList.contains('is-open')) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    // Keyboard support
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!wrapper.classList.contains('is-open')) {
          openDropdown();
        } else {
          const options = Array.from(select.options);
          let newIndex = select.selectedIndex;
          if (e.key === 'ArrowDown') newIndex = (newIndex + 1) % options.length;
          if (e.key === 'ArrowUp') newIndex = (newIndex - 1 + options.length) % options.length;
          if (e.key === 'Enter' || e.key === ' ') {
            closeDropdown();
            return;
          }
          selectOption(options[newIndex].value);
        }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    // Hook property descriptor to catch programmatic changes (select.value = '...')
    try {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (descriptor && descriptor.set) {
        Object.defineProperty(select, 'value', {
          get() {
            return descriptor.get.call(this);
          },
          set(val) {
            descriptor.set.call(this, val);
            updateUI();
          }
        });
      }
    } catch (err) {
      console.warn('Custom select property define warning:', err);
    }

    // Observe changes to options
    const observer = new MutationObserver(() => {
      buildOptions();
    });
    observer.observe(select, { childList: true, attributes: true });

    // Handle form reset
    if (select.form) {
      select.form.addEventListener('reset', () => {
        setTimeout(updateUI, 10);
      });
    }

    buildOptions();

    select._syncCustomSelect = updateUI;
    select._rebuildCustomSelect = buildOptions;
  }

  function closeAllCustomSelects() {
    document.querySelectorAll('.custom-select-wrapper.is-open').forEach(wrapper => {
      wrapper.classList.remove('is-open', 'open-upward');
      const trigger = wrapper.querySelector('.custom-select-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-wrapper')) {
      closeAllCustomSelects();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllCustomSelects();
    }
  });

  window.initCustomSelects = function(root = document) {
    root.querySelectorAll('select:not(.no-custom):not([multiple])').forEach(initCustomSelect);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.initCustomSelects();
    });
  } else {
    window.initCustomSelects();
  }
})();
