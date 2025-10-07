


/* Unified Script Build: consolidated for maintainability. */
const state = {
      currentStep: 1,
      selectedService: null,
      petCounts: { dog: 0, cat: 0, bird: 0, farm: 0, reptile: 0, other: 0 },
      customPetType: '',
      bookingType: 'one-time',
      selectedDates: [],
      dateTimes: {},
      currentMonth: new Date().getMonth(),
      currentYear: new Date().getFullYear(),
      currentModalDate: null,
      isPetPanelOpen: false,
      is24HourCare: false,
      lastDuration: 30,
      editingTimeIndex: null,
      applyAllSync: false
    };

    const timeSlots = ['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'];

    const elements = {
      steps: Array.from(document.querySelectorAll('.form-section')),
      petSection: document.getElementById('petSection'),
      petPanel: document.getElementById('petPanel'),
      petTriggerText: document.getElementById('petTriggerText'),
      petChevron: document.getElementById('petChevron'),
      petSummary: document.getElementById('petSummary'),
      bookingTypeSection: document.getElementById('bookingTypeSection'),
      houseSittingToggle: document.getElementById('houseSittingToggle'),
      houseSittingNote: document.getElementById('houseSittingNote'),
      calendarGrid: document.getElementById('calendarGrid'),
      calendarTitle: document.getElementById('calendarTitle'),
      selectedDatesContainer: document.getElementById('selectedDatesContainer'),
      selectedDateCountNum: document.getElementById('selectedDateCountNum'),
      selectedDatesList: document.getElementById('selectedDatesList'),
      calendarSubtitle: document.getElementById('calendarSubtitle'),
      timeModal: document.getElementById('timeModal'),
      modalDateTitle: document.getElementById('modalDateTitle'),
      modalDateDisplay: document.getElementById('modalDateDisplay'),
      timeSlotsContainer: document.querySelector('.time-slots-container'),
      nextBtn1: document.getElementById('nextBtn1'),
      nextBtn2: document.getElementById('nextBtn2'),
      nextBtn3: document.getElementById('nextBtn3'),
      submitBtn: document.getElementById('submitBtn'),
      addressGroup: document.getElementById('addressGroup'),
      startingAddressGroup: document.getElementById('startingAddressGroup'),
      endingAddressGroup: document.getElementById('endingAddressGroup'),
      bookingContainer: document.querySelector('.booking-container'),
      toast: document.getElementById('toast'),
      applyAllContainer: document.getElementById('applyAllContainer'),
      applyAllToggle: document.getElementById('applyAllToggle')
    };

    function debounce(fn, ms){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; }
    function normalizeDate(date){ return date.toISOString().split('T')[0]; }

    // Time Wheel Functions
    function snout_mountWheelContainer(){
      const mount = document.getElementById('snoutWheelMount');
      if(!mount) return;

      mount.innerHTML = '<div class="wheel-snout">' +
        '<div class="wheel-panel" aria-live="polite">' +
          '<div class="panel-header">' +
            '<div class="hint">Tap a time to select/deselect. Use the 30/60 switch to change duration.</div>' +
            '<button id="snoutWheelDone" class="panel-done" type="button">Done</button>' +
          '</div>' +
          '<div class="wheel">' +
            '<div id="snoutWheelList" class="wheel-list" role="listbox" aria-label="Time options"></div>' +
          '</div>' +
          '<div id="snoutWheelChips" class="chips"></div>' +
        '</div>' +
      '</div>';

      // Add Done button event listener
      const doneBtn = document.getElementById('snoutWheelDone');
      if(doneBtn) {
        doneBtn.addEventListener('click', closeTimeModal);
      }
    }

    function snout_renderWheel(dateStr){
      const wheelList = document.getElementById('snoutWheelList');
      const chips = document.getElementById('snoutWheelChips');
      if(!wheelList || !chips) return;

      wheelList.innerHTML = '';
      const start = 5 * 60;       // 5:00
      const end   = 22 * 60 + 30; // 10:30 PM

      for(let m = start; m <= end; m += 30){
        const H = Math.floor(m/60);
        const Min = m % 60;
        const key = String(H).padStart(2,'0') + ':' + String(Min).padStart(2,'0');

        const row = document.createElement('div');
        row.className = 'time-row';
        const isSelected = (state.dateTimes[dateStr] || []).some(entry => entry.time === key);
        row.setAttribute('role','option');
        row.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        row.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

        const btn = document.createElement('button');
        btn.className = 'time-btn';
        btn.type = 'button';
        btn.textContent = formatTime(key);
        btn.addEventListener('click', ()=>{
          const arr = state.dateTimes[dateStr] || [];
          const existingIndex = arr.findIndex(entry => entry.time === key);

          // Handle house sitting (only one time allowed for start/end dates)
          if(state.selectedService === 'housesitting'){
            const isFirstDate = normalizeDate(state.selectedDates[0]) === dateStr;
            const isLastDate = normalizeDate(state.selectedDates[state.selectedDates.length-1]) === dateStr;
            if(isFirstDate || isLastDate){
              // For start/end dates, replace any existing time
              state.dateTimes[dateStr] = [{time: key, duration: 30}];
            } else {
              // For middle dates, no selection allowed
              return;
            }
          } else {
            // Regular service - multiple times allowed
            if(existingIndex === -1){
              // Select default 30m
              state.dateTimes[dateStr].push({time: key, duration: 30});
              state.dateTimes[dateStr].sort((a,b)=>a.time.localeCompare(b.time));
            } else {
              // Deselect
              state.dateTimes[dateStr] = arr.filter(entry => entry.time !== key);
            }
          }

          snout_renderWheel(dateStr);
          updateSelectedDatesDisplay();
          updateNextButton3();
          refreshApplyAllUI();
          if(state.applyAllSync && dateStr === getFirstDateStr()){
            copyFirstDateTimesToOthers();
          }
        });

        // Duration switch
        const switchBtn = document.createElement('button');
        const currentDuration = (state.dateTimes[dateStr] || []).find(entry => entry.time === key)?.duration || 30;
        switchBtn.className = 'duration-switch' + (currentDuration === 60 ? ' on' : '');
        switchBtn.setAttribute('role','switch');
        switchBtn.setAttribute('aria-checked', (currentDuration === 60) ? 'true' : 'false');
        switchBtn.setAttribute('aria-label', currentDuration + ' minutes');
        switchBtn.type = 'button';
        switchBtn.innerHTML = '<span class="seg seg-30">30</span><span class="seg seg-60">60</span><span class="thumb"></span>';
        switchBtn.addEventListener('click', ()=>{
          const arr = state.dateTimes[dateStr] || [];
          const existingIndex = arr.findIndex(entry => entry.time === key);

          // Handle house sitting (only one time allowed for start/end dates)
          if(state.selectedService === 'housesitting'){
            const isFirstDate = normalizeDate(state.selectedDates[0]) === dateStr;
            const isLastDate = normalizeDate(state.selectedDates[state.selectedDates.length-1]) === dateStr;
            if(isFirstDate || isLastDate){
              if(existingIndex === -1){
                // Selecting on first tap at 30m
                state.dateTimes[dateStr] = [{time: key, duration: 30}];
              } else {
                // Toggle 30 <-> 60
                const newDuration = arr[existingIndex].duration === 60 ? 30 : 60;
                arr[existingIndex].duration = newDuration;
              }
            } else {
              // For middle dates, no selection allowed
              return;
            }
          } else {
            // Regular service - multiple times allowed
            if(existingIndex === -1){
              // Selecting on first tap at 30m
              state.dateTimes[dateStr].push({time: key, duration: 30});
              state.dateTimes[dateStr].sort((a,b)=>a.time.localeCompare(b.time));
            } else {
              // Toggle 30 <-> 60
              const newDuration = arr[existingIndex].duration === 60 ? 30 : 60;
              arr[existingIndex].duration = newDuration;
            }
          }

          snout_renderWheel(dateStr);
          updateSelectedDatesDisplay();
          updateNextButton3();
          refreshApplyAllUI();
          if(state.applyAllSync && dateStr === getFirstDateStr()){
            copyFirstDateTimesToOthers();
          }
        });

        row.appendChild(btn);
        row.appendChild(switchBtn);
        const minSpan = document.createElement('span');
        minSpan.className = 'min-label';
        minSpan.textContent = 'min';
        row.appendChild(minSpan);
        wheelList.appendChild(row);
      }

      // Render chips
      chips.innerHTML = '';
      const arr = (state.dateTimes[dateStr] || []).slice().sort((a,b)=>a.time.localeCompare(b.time));
      if(arr.length === 0){
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No times yet. Tap a time to add (30m by default).';
        chips.appendChild(empty);
        return;
      }
      arr.forEach(entry => {
        const c = document.createElement('div');
        c.className = 'chip';
        const span = document.createElement('span');
        span.textContent = formatTime(entry.time) + ' · ' + entry.duration + 'm';
        const x = document.createElement('span');
        x.className = 'remove';
        x.setAttribute('title','Remove');
        x.innerHTML = '&times;';
        x.addEventListener('click', ()=>{
          state.dateTimes[dateStr] = (state.dateTimes[dateStr] || []).filter(e => e.time !== entry.time);
          snout_renderWheel(dateStr);
          updateSelectedDatesDisplay();
          updateNextButton3();
          refreshApplyAllUI();
          if(state.applyAllSync && dateStr === getFirstDateStr()){
            copyFirstDateTimesToOthers();
          }
        });
        c.appendChild(span);
        c.appendChild(x);
        chips.appendChild(c);
      });
    }

    function getFirstDateStr(){ return state.selectedDates[0] ? normalizeDate(state.selectedDates[0]) : null; }
    function shouldShowApplyAll(){
      if(state.selectedService==='housesitting') {
        return false;
      }
      if(state.selectedDates.length < 2) {
        return false;
      }
      const first = getFirstDateStr();
      if(!first) {
        return false;
      }
      // Show toggle as soon as we have 2+ dates selected
      // The toggle will be enabled/disabled based on whether first date has times
      return true;
    }
    function refreshApplyAllUI(){
      console.log('refreshApplyAllUI called');
      console.log('elements.applyAllContainer:', elements.applyAllContainer);
      console.log('elements.applyAllToggle:', elements.applyAllToggle);

      // Safety check - if elements don't exist, try to find them again
      if(!elements.applyAllContainer || !elements.applyAllToggle) {
        console.log('Elements not found, attempting to re-find them...');
        elements.applyAllContainer = document.getElementById('applyAllContainer');
        elements.applyAllToggle = document.getElementById('applyAllToggle');
        console.log('Re-found elements:', elements.applyAllContainer, elements.applyAllToggle);
      }

// APPLY ALL TOGGLE PATCH START non house sitting only
(function(){
  if (window.__applyAllTogglePatch) return;
  window.__applyAllTogglePatch = true;

  function run(){
    try {
      if (typeof refreshApplyAllUI === 'function') refreshApplyAllUI();
    } catch(_) {}
  }

  // Fire when dates change (covers selecting 2+ days first).
  document.addEventListener('click', (e)=>{
    if (e.target.closest('.calendar-day') || e.target.closest('[data-calendar-day]')) {
      setTimeout(run, 0);
    }
  }, true);

  // Fire when first time is added (covers picking the first day’s time second).
  document.addEventListener('click', (e)=>{
    if (e.target.closest('.time-row') || e.target.closest('.time-btn') || e.target.closest('.duration-switch') || e.target.closest('.tp-card')) {
      setTimeout(run, 0);
    }
  }, true);

  // Also react when the inline picker “Done” is hit.
  document.addEventListener('click', (e)=>{
    if (e.target.closest('[data-inline-done]') || e.target.closest('.tp-done')) {
      setTimeout(run, 0);
    }
  }, true);
})();
// APPLY ALL TOGGLE PATCH END

      const visible = shouldShowApplyAll();
      const first = getFirstDateStr();
      const hasTimes = !!(first && state.dateTimes[first] && state.dateTimes[first].length > 0);
      
      if(elements.applyAllContainer){
        if(visible) {
          elements.applyAllContainer.style.display = 'inline-flex';
          elements.applyAllContainer.classList.add('show');
        } else {
          elements.applyAllContainer.style.display = 'none';
          elements.applyAllContainer.classList.remove('show');
        }
      }
      
      if(elements.applyAllToggle) {
        // Enable/disable toggle based on whether first date has times
        elements.applyAllToggle.disabled = !hasTimes;
        
        // Only auto-turn off if toggle is no longer visible (not just disabled)
        if(!visible && state.applyAllSync){
          state.applyAllSync = false;
          elements.applyAllToggle.checked = false;
          elements.applyAllToggle.setAttribute('aria-checked','false');
        }
      }
    }
    function copyFirstDateTimesToOthers(){
      const first = getFirstDateStr();
      console.log('copyFirstDateTimesToOthers called, first date:', first);
      if(!first) {
        console.log('No first date found, returning');
        return;
      }
      const source = (state.dateTimes[first] || []).map(e=> ({ time: e.time, duration: e.duration })); // deep-copy
      console.log('Source times from first date:', source);
      console.log('Selected dates:', state.selectedDates.length);
      for(let i=1;i<state.selectedDates.length;i++){
        const dStr = normalizeDate(state.selectedDates[i]);
        state.dateTimes[dStr] = source.map(e=> ({ time: e.time, duration: e.duration })); // deep copy into each date
        console.log('Copied times to date:', dStr, state.dateTimes[dStr]);
      }
      updateSelectedDatesDisplay();
      console.log('Updated display after copying times');
    }
    function onApplyAllToggleChange(){
      const checked = !!elements.applyAllToggle?.checked;
      state.applyAllSync = checked;
      elements.applyAllToggle.setAttribute('aria-checked', checked ? 'true' : 'false');
      if(checked){
        console.log('Apply to all toggle enabled, copying times...');
        copyFirstDateTimesToOthers();
      } else {
        console.log('Apply to all toggle disabled');
      }
    }

    // Debug function to manually test toggle visibility
    window.testToggle = function() {
      console.log('=== MANUAL TOGGLE TEST ===');
      console.log('Current state:', {
        selectedService: state.selectedService,
        selectedDates: state.selectedDates,
        dateTimes: state.dateTimes
      });

      const first = getFirstDateStr();
      console.log('First date:', first);
      console.log('First date times:', first ? state.dateTimes[first] : 'N/A');

      const shouldShow = shouldShowApplyAll();
      console.log('Should show toggle:', shouldShow);

      if(elements.applyAllContainer) {
        console.log('Toggle container found:', elements.applyAllContainer);
        console.log('Current display style:', elements.applyAllContainer.style.display);
        console.log('Computed display style:', window.getComputedStyle(elements.applyAllContainer).display);

        // Force show the toggle for testing
        elements.applyAllContainer.style.display = 'inline-flex';
        console.log('Forced toggle to show');
      } else {
        console.log('ERROR: Toggle container not found!');
      }
    };

    function togglePetPanel(){
      state.isPetPanelOpen=!state.isPetPanelOpen;
      const trigger=document.querySelector('.pet-dropdown-trigger');
      elements.petPanel.classList.toggle('active', state.isPetPanelOpen);
      trigger.classList.toggle('active', state.isPetPanelOpen);
      elements.petChevron.style.transform = state.isPetPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)';
      // Remove form extension behavior - keep fixed height
      elements.petSection.style.height='auto';
      // Don't add pet-dropdown-open class to prevent form extension
      if(state.isPetPanelOpen){ setTimeout(()=>{ elements.petPanel.scrollIntoView({behavior:'smooth', block:'nearest'}); },300); }
    }

    function nextStep(step){
      if(!validateStep(state.currentStep)) return;
      elements.steps[state.currentStep-1].classList.remove('active');
      elements.steps[step-1].classList.add('active');
      state.currentStep=step; setupStep(step);
      if(state.isPetPanelOpen) togglePetPanel();
    }
    function prevStep(step){
      elements.steps[state.currentStep-1].classList.remove('active');
      elements.steps[step-1].classList.add('active');
      state.currentStep=step; setupStep(step);
      if(state.isPetPanelOpen) togglePetPanel();
    }

    function validateStep(step){
      switch(step){
        case 1: {
          if(!state.selectedService){ alert('Please select a service'); return false; }
          const totalPets = Object.values(state.petCounts).reduce((a,b)=>a+b,0);
          if(totalPets===0){ alert('Please select at least one pet'); return false; }
          if(state.petCounts.other>0 && !state.customPetType.trim()){ alert('Please enter a type for "Other" pets'); return false; }
          if(state.selectedService==='taxi' && totalPets>2){
            if(!confirm('Pet Taxi service has space for up to 2 pets. Additional pets may require multiple trips. Continue?')) return false;
          }
          return true;
        }
        case 2: {
          if(state.selectedService==='housesitting'){
            if(state.selectedDates.length<2){ alert('Please select at least a start and end date for house sitting'); return false; }
            if(state.selectedDates[1] <= state.selectedDates[0]){ alert('End date must be after the start date'); return false; }
            if(state.selectedDates.length>14){
              if(!confirm('House sitting bookings longer than 14 days require special approval. Continue?')) return false;
            }
          } else {
            if(state.selectedDates.length===0){ alert('Please select at least one date'); return false; }
          }
          return true;
        }
        case 3: {
          if(state.selectedService==='housesitting'){
            const startDateStr = normalizeDate(state.selectedDates[0]);
            const endDateStr   = normalizeDate(state.selectedDates[state.selectedDates.length-1]);
            if(!(state.dateTimes[startDateStr] && state.dateTimes[startDateStr].length===1)){ alert('Please select exactly one start time'); return false; }
            if(!(state.dateTimes[endDateStr] && state.dateTimes[endDateStr].length===1)){ alert('Please select exactly one end time'); return false; }
          } else {
            const firstDateStr = normalizeDate(state.selectedDates[0]);
            if(!(state.dateTimes[firstDateStr] && state.dateTimes[firstDateStr].length>0)){ alert('Please select at least one time for the first date'); return false; }
          }
          return true;
        }
        case 4: {
          const requiredFields=['firstName','lastName','phone','email'];
          if(state.selectedService==='taxi'){ requiredFields.push('startingAddress','endingAddress'); } else { requiredFields.push('address'); }
          const allFilled = requiredFields.every(id=>document.getElementById(id).value.trim());
          const policyChecked = document.getElementById('policyAgreement').checked;
          if(!allFilled || !policyChecked){ alert('Please complete all required fields and agree to the policy'); return false; }
          return true;
        }
      }
    }

    function setupStep(step){
      if(step===2){ generateCalendar(); updateSelectedDatesSummary(); updateCalendarSubtitle(); }
      else if(step===3){ updateSelectedDatesDisplay(); refreshApplyAllUI(); updateNextButton3(); }
      else if(step===4){
        updateContactValidation();
        elements.startingAddressGroup.style.display = state.selectedService==='taxi' ? 'block' : 'none';
        elements.endingAddressGroup.style.display   = state.selectedService==='taxi' ? 'block' : 'none';
        elements.addressGroup.style.display         = state.selectedService==='taxi' ? 'none'  : 'block';
      }
    }

    function selectService(card, service){
      document.querySelectorAll('.service-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedService=service;
      state.selectedDates=[]; state.dateTimes={};
      elements.petSection.style.display='block';
      elements.bookingTypeSection.style.display='grid';
      elements.houseSittingToggle.style.display = service==='housesitting' ? 'flex' : 'none';
      elements.houseSittingNote.style.display   = service==='housesitting' ? 'block' : 'none';
      if(service!=='housesitting'){ const care=document.getElementById('care24Hour'); if(care) care.checked=false; state.is24HourCare=false; }
      updateNextButton1(); generateCalendar(); updateSelectedDatesSummary(); updateNextButton2(); refreshApplyAllUI(); refreshApplyAllUI(); refreshApplyAllUI();
    }

    function update24HourCare(checked){ state.is24HourCare=checked; }
    function updatePetCount(type, change){
      state.petCounts[type]=Math.max(0, state.petCounts[type]+change);
      const input = document.querySelector('.pet-counter[data-type="'+type+'"] .pet-counter-input');
      if(input) input.value = state.petCounts[type];
      updatePetSummary(); updateNextButton1();
    }
    function handleCustomPetType(value){ state.customPetType=value; updatePetSummary(); updateNextButton1(); }
    function updatePetSummary(){
      elements.petSummary.innerHTML='';
      Object.entries(state.petCounts).forEach(([type,count])=>{
        if(count>0){
          const displayType = type==='other' ? (state.customPetType || 'Other') : type.charAt(0).toUpperCase()+type.slice(1);
          const chip=document.createElement('span'); chip.className='pet-chip'; chip.textContent=displayType+' x '+count;
          elements.petSummary.appendChild(chip);
        }
      });
      const totalPets = Object.values(state.petCounts).reduce((a,b)=>a+b,0);
      elements.petTriggerText.textContent = totalPets>0 ? (totalPets+' pet'+(totalPets>1?'s':'' )+' selected') : 'Select your pets';
    }
    function selectType(card, type){
      document.querySelectorAll('.type-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected'); state.bookingType=type; updateNextButton1();
    }
    function updateNextButton1(){
      const totalPets = Object.values(state.petCounts).reduce((a,b)=>a+b,0);
      const validPets = totalPets>0 && (state.petCounts.other===0 || state.customPetType.trim());
      elements.nextBtn1.disabled = !(state.selectedService && validPets && state.bookingType);
    }

    function generateCalendar(){
      const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
      elements.calendarTitle.textContent = monthNames[state.currentMonth]+' '+state.currentYear;
      elements.calendarGrid.querySelectorAll('.calendar-day').forEach(d=>d.remove());
      const today=new Date(); today.setHours(0,0,0,0);
      const firstDay=new Date(state.currentYear, state.currentMonth, 1);
      const firstDayOfWeek=firstDay.getDay();
      const daysInMonth=new Date(state.currentYear, state.currentMonth+1, 0).getDate();
      const prevMonthDays=firstDayOfWeek;
      const prevMonth= state.currentMonth===0 ? 11 : state.currentMonth-1;
      const prevYear = state.currentMonth===0 ? state.currentYear-1 : state.currentYear;
      const daysInPrevMonth=new Date(prevYear, prevMonth+1, 0).getDate();
      let currentDate=new Date(prevYear, prevMonth, daysInPrevMonth - prevMonthDays + 1);
      for(let i=0;i<prevMonthDays;i++){ elements.calendarGrid.appendChild(createDayCell(currentDate,false,today)); currentDate=new Date(currentDate); currentDate.setDate(currentDate.getDate()+1); }
      for(let day=1; day<=daysInMonth; day++){ const date=new Date(state.currentYear, state.currentMonth, day); elements.calendarGrid.appendChild(createDayCell(date,true,today)); }
      const totalCells=prevMonthDays+daysInMonth;
      const remainingCells=Math.ceil(totalCells/7)*7-totalCells;
      currentDate=new Date(state.currentYear, state.currentMonth+1, 1);
      for(let i=0;i<remainingCells;i++){ elements.calendarGrid.appendChild(createDayCell(currentDate,false,today)); currentDate=new Date(currentDate); currentDate.setDate(currentDate.getDate()+1); }
    }
    function createDayCell(date, isCurrentMonth, today){
      const dayCell=document.createElement('div');
      const dateStr=normalizeDate(date);
      const isToday = dateStr===normalizeDate(today);
      const isSelected = state.selectedDates.some(d=>normalizeDate(d)===dateStr);
      const isPast = date<today && !isToday;
      dayCell.className = 'calendar-day '+(!isCurrentMonth?'other-month ':'')+(isPast?'disabled ':'')+(isToday?'today ':'')+(isSelected?'selected':'');
      dayCell.innerHTML = '<div class="day-number">'+date.getDate()+'</div>';
      if(!isPast){ dayCell.addEventListener('click', ()=>toggleDate(new Date(date))); }
      return dayCell;
    }
    function areDatesConsecutive(dates){
      if(dates.length<2) return true;
      const sorted=[...dates].sort((a,b)=>a-b);
      for(let i=1;i<sorted.length;i++){ const prev=new Date(sorted[i-1]); const curr=new Date(sorted[i]); if((curr-prev)/(1000*60*60*24)!==1) return false; }
      return true;
    }
    function toggleDate(date){
      const dateStr=normalizeDate(date);
      const idx=state.selectedDates.findIndex(d=>normalizeDate(d)===dateStr);
      if(idx>-1){ state.selectedDates.splice(idx,1); delete state.dateTimes[dateStr]; }
      else {
        state.selectedDates.push(new Date(date.setHours(0,0,0,0)));
        if(state.selectedService!=='housesitting'){ if(!state.dateTimes[dateStr]) state.dateTimes[dateStr]=[]; }
        else { state.dateTimes[dateStr]=state.dateTimes[dateStr]||[]; }
      }
      state.selectedDates.sort((a,b)=>a-b);
      if(state.selectedService==='housesitting' && state.selectedDates.length>2 && !areDatesConsecutive(state.selectedDates)){
        alert('For house sitting, please select consecutive dates.');
        state.selectedDates.splice(-1,1); delete state.dateTimes[dateStr];
      }
      generateCalendar(); updateSelectedDatesSummary(); updateNextButton2(); refreshApplyAllUI(); refreshApplyAllUI();
    }

    // Safe DOM build to avoid template literal parsing errors
    function updateSelectedDatesDisplay(){
      elements.selectedDatesContainer.style.display = state.selectedDates.length===0 ? 'none' : 'block';
      elements.selectedDateCountNum.textContent = state.selectedDates.length;
      elements.selectedDatesList.innerHTML='';
      let displayDates = state.selectedDates;
      if(state.selectedService==='housesitting' && state.selectedDates.length>=3){ displayDates=[state.selectedDates[0], state.selectedDates[state.selectedDates.length-1]]; }

      displayDates.forEach((date)=>{
        const dateStr=normalizeDate(date);
        let timesDisplay;
        if(state.selectedService==='housesitting'){
          const times = state.dateTimes[dateStr] ? [...state.dateTimes[dateStr]] : [];
          if(times.length >= 2) {
            timesDisplay = `${formatTime(times[0].time)}–${formatTime(times[1].time)}`;
          } else if(times.length === 1) {
            timesDisplay = formatTime(times[0].time);
          } else {
            timesDisplay = 'No times selected';
          }
        } else {
          const entries = state.dateTimes[dateStr] ? [...state.dateTimes[dateStr]].sort((a,b)=>a.time.localeCompare(b.time)) : [];
          timesDisplay = entries.length>0 ? entries.map(e=> (formatTime(e.time)+' · '+e.duration+'m')).join(', ') : 'No times selected';
        }
        const formattedDate = date.toLocaleDateString('en-US',{weekday:'long', month:'short', day:'numeric', year:'numeric'});
        const isHouseSitting = state.selectedService==='housesitting';
        const isFirstDate = dateStr === (state.selectedDates[0] ? normalizeDate(state.selectedDates[0]) : '');
        const isLastDate  = dateStr === (state.selectedDates[state.selectedDates.length-1] ? normalizeDate(state.selectedDates[state.selectedDates.length-1]) : '');
        const isMiddleDate = isHouseSitting && state.selectedDates.length>2 && !isFirstDate && !isLastDate;

        const item = document.createElement('li');
        item.className = 'selected-date-card';
        item.setAttribute('data-date-id', dateStr);

        const dateRow = document.createElement('div');
        dateRow.className = 'selected-date-row';

        const dateLabel = document.createElement('div');
        dateLabel.className = 'date-label';
        dateLabel.textContent = formattedDate;

        const timesLine = document.createElement('div');
        timesLine.className = 'selected-times-line';
        timesLine.textContent = timesDisplay;

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'add-times-btn' + (isMiddleDate ? ' disabled' : '');
        addBtn.setAttribute('aria-label', 'Add times');
        if(!isMiddleDate){ addBtn.addEventListener('click', ()=>openTimeModal(dateStr)); }
        addBtn.innerHTML = '<span>+</span>';

        dateRow.appendChild(dateLabel);
        dateRow.appendChild(timesLine);
        dateRow.appendChild(addBtn);

        const timePickerSlot = document.createElement('div');
        timePickerSlot.className = 'time-picker-slot';

        item.appendChild(dateRow);
        item.appendChild(timePickerSlot);

        elements.selectedDatesList.appendChild(item);
      });
    }

    function removeDate(index){
      const dateStr=normalizeDate(state.selectedDates[index]);
      state.selectedDates.splice(index,1); delete state.dateTimes[dateStr];
      generateCalendar(); updateSelectedDatesSummary(); updateNextButton2(); refreshApplyAllUI(); refreshApplyAllUI();
    }

    function openTimeModal(dateStr){
      try {
        if (window.elements && elements.modalOverlay) elements.modalOverlay.style.display = 'none';

        const dateRow =
          document.querySelector(`[data-date="${dateStr}"]`) ||
          document.querySelector(`[data-date-item="${dateStr}"]`) ||
          null;

        // mount under the selected date row
        let mount = dateRow ? dateRow.querySelector('[data-inline-time]') : null;
        if (!mount && dateRow) {
          mount = document.createElement('div');
          mount.className = 'inline-time-slot';
          mount.setAttribute('data-inline-time','');
          dateRow.appendChild(mount);
        }
        if (!mount) {
          mount = document.querySelector('.selected-dates') || document.getElementById('selectedDates') || document.body;
        }

        mount.innerHTML = ""
          + "<div class='inline-time-panel'>"
          + "  <div class='time-modal-content'>"
          + "    <div class='panel-header'>"
          + "      <div class='hint'>Tap a time to select or deselect. Use the 30 60 switch to change duration.</div>"
          + "      <button type='button' class='panel-done' data-inline-done>Done</button>"
          + "    </div>"
          + "    <div class='wheel-snout wheel-panel'>"
          + "      <div class='wheel'>"
          + "        <div id='snoutWheelList' class='wheel-list' role='listbox' aria-label='Time options'></div>"
          + "      </div>"
          + "      <div id='snoutWheelChips' class='chips'></div>"
          + "    </div>"
          + "  </div>"
          + "</div>";

        if (!window.state) window.state = {};
        if (!state.dateTimes) state.dateTimes = {};
        if (!state.dateTimes[dateStr]) state.dateTimes[dateStr] = [];
        state.editingTimeIndex = null;

        if (typeof snout_renderWheel === 'function') snout_renderWheel(dateStr);

        // match width to the selected date box
        const targetBox = (dateRow && (dateRow.querySelector('.selected-date-inner') || dateRow)) || mount.parentElement;
        const applyWidth = ()=>{
          const w = Math.max(0, Math.floor(targetBox.getBoundingClientRect().width));
          const panel = mount.querySelector('.inline-time-panel');
          if (panel) { panel.style.width = w + 'px'; panel.style.maxWidth = w + 'px'; }
        };
        applyWidth();
        if (window.ResizeObserver) new ResizeObserver(applyWidth).observe(targetBox);
        window.addEventListener('resize', applyWidth, { passive: true });

        // Done collapses panel and persists
        const doneBtn = mount.querySelector('[data-inline-done]');
        if (doneBtn) {
          doneBtn.onclick = ()=>{
            if (typeof updateSelectedDatesDisplay === 'function') updateSelectedDatesDisplay();
            if (typeof updateNextButton3 === 'function') updateNextButton3();
            if (typeof refreshApplyAllUI === 'function') refreshApplyAllUI();
            mount.innerHTML = "";
          };
        }
      } catch (e) { console.error('openTimeModal inline error', e); }
    }

    function closeTimeModal(){ 
      elements.timeModal.classList.remove('active'); 
      document.body.classList.remove('modal-open', 'overlay-open');
      state.currentModalDate=null; 
      state.editingTimeIndex=null; 
      updateSelectedDatesDisplay(); 
      updateNextButton3(); 
      refreshApplyAllUI(); 
    }

    function showToast(msg){ elements.toast.textContent=msg; elements.toast.style.display='block'; setTimeout(()=>{ elements.toast.style.display='none'; },3000); }
    function prevMonth(){ state.currentMonth--; if(state.currentMonth<0){ state.currentMonth=11; state.currentYear--; } generateCalendar(); }
    function nextMonth(){ state.currentMonth++; if(state.currentMonth>11){ state.currentMonth=0; state.currentYear++; } generateCalendar(); }
    function formatTime(timeStr){ const [hour,minute]=timeStr.split(':'); let hour12=parseInt(hour,10)%12 || 12; const period=parseInt(hour,10)>=12?'PM':'AM'; return (hour12.toString().padStart(2,'0'))+':'+minute+' '+period; }
    function updateCalendarSubtitle(){
      elements.calendarSubtitle.textContent = state.selectedService==='housesitting'
        ? 'Tap start and end dates. Times will be selected in the next step.'
        : 'Tap dates to select/deselect. Times will be selected in the next step.';
    }
    function updateNextButton2(){
      if(!elements.nextBtn2) return;
      
      let shouldEnable = false;
      
      if(state.selectedService==='housesitting'){
        shouldEnable = state.selectedDates.length>=2 && (state.selectedDates[state.selectedDates.length-1] > state.selectedDates[0]);
      } else {
        shouldEnable = state.selectedDates.length>0;
      }
      
      elements.nextBtn2.disabled = !shouldEnable;
      elements.nextBtn2.setAttribute('aria-disabled', String(!shouldEnable));
      elements.nextBtn2.classList.toggle('is-disabled', !shouldEnable);
      elements.nextBtn2.style.pointerEvents = shouldEnable ? 'auto' : 'none';
      elements.nextBtn2.style.opacity = shouldEnable ? '' : '.6';
    }
    function updateNextButton3(){
      if(state.selectedService==='housesitting'){
        const startDateStr = state.selectedDates[0] ? normalizeDate(state.selectedDates[0]) : null;
        const endDateStr   = state.selectedDates[state.selectedDates.length-1] ? normalizeDate(state.selectedDates[state.selectedDates.length-1]) : null;
        const hasStart = !!(startDateStr && state.dateTimes[startDateStr] && state.dateTimes[startDateStr].length===1);
        const hasEnd   = !!(endDateStr && state.dateTimes[endDateStr] && state.dateTimes[endDateStr].length===1);
        elements.nextBtn3.disabled = !(state.selectedDates.length>=2 && (state.selectedDates[state.selectedDates.length-1] > state.selectedDates[0]) && hasStart && hasEnd);
      } else {
        const firstDateStr = state.selectedDates[0] ? normalizeDate(state.selectedDates[0]) : null;
        elements.nextBtn3.disabled = !(state.selectedDates.length>0 && (state.dateTimes[firstDateStr] && state.dateTimes[firstDateStr].length>0));
      }
    }

    function updateContactValidation(){
      const fields=['firstName','lastName','phone','email', state.selectedService==='taxi' ? 'startingAddress' : 'address'];
      if(state.selectedService==='taxi') fields.push('endingAddress');
      const policy=document.getElementById('policyAgreement');
      const validator=debounce(()=>{
        const allFilled = fields.every(id=>document.getElementById(id).value.trim());
        elements.submitBtn.disabled = !(allFilled && policy.checked);
      },100);
      fields.forEach(id=>document.getElementById(id)?.addEventListener('input', validator));
      policy.addEventListener('change', validator);
    }

    function startNewBooking(){ resetForm(); nextStep(1); }

    function updateSelectedDatesSummary(){
      const summaryContainer = document.getElementById('selectedDatesSummary');
      const summaryList = document.getElementById('selectedDatesSummaryList');
      const countElement = document.getElementById('selectedDateCountNum');
      
      if(!summaryContainer || !summaryList || !countElement) return;
      
      countElement.textContent = state.selectedDates.length;
      
      if(state.selectedDates.length === 0){
        summaryContainer.style.display = 'none';
        return;
      }
      
      summaryContainer.style.display = 'block';
      summaryList.innerHTML = '';
      
      state.selectedDates.forEach(date => {
        const dateStr = normalizeDate(date);
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
        
        const dateItem = document.createElement('div');
        dateItem.className = 'selected-date-item';
        dateItem.innerHTML = `
          <div class="selected-date-text">${formattedDate}</div>
        `;
        summaryList.appendChild(dateItem);
      });
    }

    function submitForm(){
      if(!validateStep(4)) return;
      const totalPets=Object.values(state.petCounts).reduce((a,b)=>a+b,0);
      const formData={
        service: state.selectedService,
        pets: Object.entries(state.petCounts).filter(([_,count])=>count>0).map(([type,count])=>({ type: type==='other'?'other':type, count, customType: type==='other'? state.customPetType : '' })),
        totalPets,
        bookingType: state.bookingType,
        is24HourCare: state.selectedService==='housesitting' ? state.is24HourCare : false,
        dates: state.selectedService==='housesitting'
          ? {
              startDate: state.selectedDates[0] ? normalizeDate(state.selectedDates[0]) : '',
              endDate:   state.selectedDates[state.selectedDates.length-1] ? normalizeDate(state.selectedDates[state.selectedDates.length-1]) : '',
              startTime: state.dateTimes[normalizeDate(state.selectedDates[0])]?.[0]?.time || '',
              endTime:   state.dateTimes[normalizeDate(state.selectedDates[state.selectedDates.length-1])]?.[0]?.time || ''
            }
          : state.selectedDates.map(d=>({ date: normalizeDate(d), times: state.dateTimes[normalizeDate(d)] || [] })),
        contact: {
          firstName: document.getElementById('firstName').value,
          lastName:  document.getElementById('lastName').value,
          phone:     document.getElementById('phone').value,
          email:     document.getElementById('email').value,
          address:   state.selectedService==='taxi' ? '' : document.getElementById('address').value,
          startingAddress: state.selectedService==='taxi' ? document.getElementById('startingAddress').value : '',
          endingAddress:   state.selectedService==='taxi' ? document.getElementById('endingAddress').value   : '',
          instructions: document.getElementById('instructions').value
        },
        timestamp: new Date().toISOString()
      };
      console.log('Booking Data:', formData);
        elements.steps[3].classList.remove('active');
        elements.steps[4].classList.add('active');
        state.currentStep=5;
    }

    function resetForm(){
      Object.assign(state, {
        currentStep:1, selectedService:null,
        petCounts:{ dog:0, cat:0, bird:0, farm:0, reptile:0, other:0 },
        customPetType:'', bookingType:'one-time', is24HourCare:false,
        selectedDates:[], dateTimes:{},
        currentMonth:new Date().getMonth(), currentYear:new Date().getFullYear(),
        isPetPanelOpen:false, lastDuration:30, editingTimeIndex:null
      });
      document.querySelectorAll('.service-card, .type-card').forEach(c=>c.classList.remove('selected'));
      const one = document.querySelector('.type-card[data-type="one-time"]'); if(one) one.classList.add('selected');
      elements.petSection.style.display='none';
      elements.bookingTypeSection.style.display='none';
      elements.houseSittingToggle.style.display='none';
      elements.houseSittingNote.style.display='none';
      elements.selectedDatesContainer.style.display='none';
      elements.startingAddressGroup.style.display='none';
      elements.endingAddressGroup.style.display='none';
      elements.addressGroup.style.display='block';
      document.querySelectorAll('.contact-input').forEach(i=>i.value='');
      const care = document.getElementById('care24Hour'); if(care) care.checked=false;
      const policy = document.getElementById('policyAgreement'); if(policy) policy.checked=false;
      elements.steps.forEach((step,i)=>step.classList.toggle('active', i===0));
      elements.petPanel.classList.remove('active');
      const trigger = document.querySelector('.pet-dropdown-trigger'); if(trigger) trigger.classList.remove('active');
      elements.petChevron.style.transform='rotate(0deg)';
      elements.petSection.style.height='auto';
      elements.bookingContainer.classList.remove('pet-dropdown-open');
      updatePetSummary(); generateCalendar(); updateNextButton1();
      elements.nextBtn2.disabled=true; elements.submitBtn.disabled=true;
    }

    document.addEventListener('DOMContentLoaded', ()=>{
      const phoneInput=document.getElementById('phone');
      if(phoneInput){
        phoneInput.addEventListener('input', e=>{
          let v=e.target.value.replace(/\D/g,'');
          if(v.length>=6){ v=v.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'); }
          else if(v.length>=3){ v=v.replace(/(\d{3})(\d{0,3})/, '($1) $2'); }
          e.target.value=v;
        });
      }
      elements.timeModal.addEventListener('click', e=>{ 
        // Close modal when clicking on the backdrop (not on the modal content)
        if(e.target === elements.timeModal || !e.target.closest('.time-modal-content')) {
          closeTimeModal(); 
        }
      });
      document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ if(elements.timeModal.classList.contains('active')) closeTimeModal(); if(state.isPetPanelOpen) togglePetPanel(); }});
      document.addEventListener('click', e=>{ if(state.isPetPanelOpen && !e.target.closest('.pet-dropdown')) togglePetPanel(); });
      if(elements.applyAllToggle){ elements.applyAllToggle.addEventListener('change', onApplyAllToggleChange); }
      generateCalendar(); updatePetSummary();
      // Ensure elements are properly initialized before calling refreshApplyAllUI
      if(elements.applyAllContainer && elements.applyAllToggle) {
        refreshApplyAllUI();
      } else {
        console.log('Elements not ready, skipping initial refreshApplyAllUI');
      }
    });

    function calculateTotalVisits(){
      if(state.selectedService==='housesitting') return 1;
      return state.selectedDates.reduce((total,date)=> total + (state.dateTimes[normalizeDate(date)]?.length || 0), 0);
    }

    // Time Picker System
    (() => {
      const STATE = new Map(); // dateId -> { "05:00":30, ... }

      // UTIL: build times 5:00 AM → 10:30 PM at 30-min steps
      function buildTimes(){
        const out = [];
        let h = 5, m = 0;
        while (h < 23 || (h === 22 && m <= 30)){   // up to 10:30 PM
          out.push({label: toLabel(h,m), key: `${pad(h)}:${pad(m)}`});
          m += 30; if(m === 60){ m = 0; h += 1; }
        }
        return out;
      }
      const TIMES = buildTimes();

      function toLabel(h,m){
        const ampm = h >= 12 ? "PM" : "AM";
        const hh = ((h + 11) % 12) + 1;
        return `${pad(hh)}:${pad(m)} ${ampm}`;
      }
      function pad(n){ return String(n).padStart(2,"0"); }

      // Mount picker inside a slot
      function openPickerFor(dateId, slotEl){
        // close any existing
        document.querySelectorAll(".tp-card").forEach(el => el.closest(".time-picker-slot")?.classList.remove("tp-open") || el.remove());

        const tpl = document.getElementById("timePickerTemplate");
        const card = tpl.content.firstElementChild.cloneNode(true);
        slotEl.innerHTML = ""; slotEl.appendChild(card);
        slotEl.classList.add("tp-open");

        const list = card.querySelector(".tp-list");
        list.innerHTML = "";

        const selected = STATE.get(dateId) || {}; // { "08:30": 60 }
        TIMES.forEach(t => {
          const row = document.createElement("div");
          row.className = "tp-row" + (selected[t.key] ? " is-selected" : "");
          row.dataset.key = t.key;

          const left = document.createElement("div"); left.textContent = t.label;

          // toggle
          const box = document.createElement("div"); box.className = "tp-toggle"; box.setAttribute("aria-label","duration toggle");
          const chip30 = document.createElement("span"); chip30.className = "tp-chip"; chip30.textContent = "30";
          const chip60 = document.createElement("span"); chip60.className = "tp-chip"; chip60.textContent = "60";
          box.append(chip30, chip60);

          // set active chip based on state or default 30
          const dur = selected[t.key] || 30;
          (dur === 30 ? chip30 : chip60).classList.add("is-active");

          // click time row add/remove
          row.addEventListener("click", (e) => {
            // ignore if clicking chips – they manage duration, not selection
            if(e.target === chip30 || e.target === chip60) return;

            const next = STATE.get(dateId) || {};
            if(next[t.key]){ delete next[t.key]; row.classList.remove("is-selected"); }
            else { next[t.key] = 30; row.classList.add("is-selected"); chip30.classList.add("is-active"); chip60.classList.remove("is-active"); }
            STATE.set(dateId, next);
            renderSummary(dateId);
          });

          // chip handlers
          chip30.addEventListener("click", (e) => {
            e.stopPropagation();
            const next = STATE.get(dateId) || {};
            if(!next[t.key]) next[t.key] = 30;
            else next[t.key] = 30;
            chip30.classList.add("is-active"); chip60.classList.remove("is-active");
            row.classList.add("is-selected");
            STATE.set(dateId, next);
            renderSummary(dateId);
          });
          chip60.addEventListener("click", (e) => {
            e.stopPropagation();
            const next = STATE.get(dateId) || {};
            if(!next[t.key]) next[t.key] = 60;
            else next[t.key] = 60;
            chip60.classList.add("is-active"); chip30.classList.remove("is-active");
            row.classList.add("is-selected");
            STATE.set(dateId, next);
            renderSummary(dateId);
          });

          row.append(left, box);
          list.appendChild(row);
        });

        card.querySelector(".tp-done").addEventListener("click", () => {
          // close but keep state
          card.remove();
          slotEl.classList.remove("tp-open");
        });
      }

      // Update the little "No times selected" line inside that date card
      function renderSummary(dateId){
        const dateCard = document.querySelector(`[data-date-id="${CSS.escape(dateId)}"]`);
        if(!dateCard) return;
        const line = dateCard.querySelector(".selected-times-line");
        const s = STATE.get(dateId) || {};
        const keys = Object.keys(s).sort();
        if(keys.length === 0){
          line.textContent = "No times selected";
          return;
        }
        const text = keys.map(k => {
          const [h,m] = k.split(":").map(Number);
          const label = toLabel(h,m);
          const dur = s[k];
          return `${label} ${dur}m`;
        }).join(", ");
        line.textContent = text;
      }

      // Hook your existing + buttons
      // Your date card wrapper must include data-date-id="YYYY-MM-DD" (or unique id)
      document.addEventListener("click", (e) => {
        const btn = e.target.closest(".add-times-btn");
        if(!btn) return;
        const card = btn.closest("[data-date-id]");
        const dateId = card.getAttribute("data-date-id");
        const slot = card.querySelector(".time-picker-slot");
        openPickerFor(dateId, slot);
      });

      // Export STATE if you need it elsewhere
      window.getSelectedTimesByDate = () => {
        // returns { "2025-09-30": { "05:00":30, "10:00":60 }, ... }
        return Object.fromEntries(STATE.entries());
      };
    })();

/* ===== SNOUT FIX PATCH (non-destructive overlay) ===== */
(function(){
  if (window.__snoutFixPatch) return; window.__snoutFixPatch = true;

  function normalizeKey(x){
    try{
      if (x instanceof Date) return (x.toISOString().split('T')[0]);
      if (typeof x === 'number') return (new Date(x)).toISOString().split('T')[0];
      if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
      const d = new Date(x); return isNaN(d) ? String(x) : d.toISOString().split('T')[0];
    }catch(_){ return String(x); }
  }




  const _origValidateStep = typeof window.validateStep === 'function' ? window.validateStep : null;
  if (_origValidateStep){
    window.validateStep = function(step){
      if (step === 2){
        const sel = (state.selectedDates||[]);
        if (!sel.length){ alert('Please select at least one date'); return false; }
        // For step 2 (calendar page), only check dates, not times
        return true;
      }
      return _origValidateStep(step);
    };
  }

  const _origOpenInline = typeof window.openInlineTimePicker === 'function' ? window.openInlineTimePicker : null;
  if (_origOpenInline){
    window.openInlineTimePicker = function(dateStr, slotEl){
      _origOpenInline(dateStr, slotEl);
      try{
        const key = normalizeKey(dateStr);
        const sel = (state.selectedDates||[]).slice().sort((a,b)=>a-b);
        const firstKey = sel[0] ? normalizeKey(sel[0]) : null;
        const lastKey  = sel.length ? normalizeKey(sel[sel.length-1]) : null;
        const isHS = state.selectedService === 'housesitting';
        const isBoundary = isHS && (key === firstKey || key === lastKey);

        const card = slotEl && slotEl.querySelector && slotEl.querySelector('.tp-card');
        if (!card) return;

        card.addEventListener('click', function(){
          setTimeout(()=>{
            if (!isBoundary) return;
            const arr = (state.dateTimes && state.dateTimes[key]) || [];
            if (arr.length > 2){
              arr.sort((a,b)=>a.time.localeCompare(b.time));
              state.dateTimes[key] = arr.slice(0,2);
              if (typeof window.updateSelectedDatesDisplay === 'function') window.updateSelectedDatesDisplay();
              if (typeof window.openInlineTimePicker === 'function') window.openInlineTimePicker(key, slotEl);
            }
            if (isHS && sel.length >= 2){
              document.querySelectorAll('#selectedDatesList .selected-date-item').forEach(li=>{
                const id = li.getAttribute('data-date-id');
                li.style.display = (id === firstKey || id === lastKey) ? '' : 'none';
              });
            }
            // Button state will be updated by updateNextButton2 calls
          }, 0);
        }, true);
      }catch(_){}
    };
  }

  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.add-times-btn');
    if (!btn) return;
    const item = btn.closest('.selected-date-item');
    if (!item) return;
    const id = item.getAttribute('data-date-id');
    const slot = item.querySelector('.time-picker-slot');
    if (typeof window.openInlineTimePicker === 'function' && id && slot){
      state.inlineOpenDateStr = id;
      window.openInlineTimePicker(id, slot);
    }
  }, true);

  (function(){
    var note = document.getElementById('houseSittingNote');
    if (!note) return;
    var p = note.querySelector('p');
    if (!p) return;
    if (p.textContent.indexOf('exactly one') !== -1){
      p.innerHTML = 'For house sitting, select <strong>start</strong> and <strong>end</strong> dates. You can choose up to <strong>two times</strong> on each boundary date (shown as a range).';
    }
  })();

  (function(){
    var t = document.querySelector('#step4 .section-title');
    if (t && /Booking Confirmed/i.test(t.textContent)){
      t.textContent = 'Booking received';
    }
  })();

  document.addEventListener('click', (e)=>{
    if (e.target.closest('.calendar-day') ||
        e.target.closest('.tp-row') ||
        e.target.closest('.tp-chip') ||
        e.target.closest('.add-times-btn')){
      setTimeout(()=>{
        // Button state will be updated by updateNextButton2 calls
        // Button state will be updated by updateNextButton2 calls
      }, 0);
    }
  }, true);

  setTimeout(()=>{
    if (typeof window.updateNextButton2 === 'function') window.updateNextButton2();
    // Button state will be updated by updateNextButton2 calls
  }, 0);

})();

/* ===== SNOUT INLINE FIX PATCH ===== */
(function(){
  if (window.__snoutInlineFix) return; window.__snoutInlineFix = true;

  // --- helpers ---
  function pad(n){ return String(n).padStart(2,'0'); }
  function normalizeKey(x){
    if (x instanceof Date) return x.toISOString().split('T')[0];
    if (typeof x === 'number') return new Date(x).toISOString().split('T')[0];
    if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
    const d = new Date(x); return isNaN(d) ? String(x) : d.toISOString().split('T')[0];
  }
  function fmtLabel(hhmm){
    if (typeof window.formatTime === 'function') return formatTime(hhmm);
    const [H,M] = hhmm.split(':').map(Number);
    const ampm = H >= 12 ? 'PM' : 'AM';
    const h12  = ((H + 11) % 12) + 1;
    return `${h12}:${pad(M)} ${ampm}`;
  }
  function timesList(){
    const out = [];
    for (let m = 5*60; m <= 22*60 + 30; m += 30){
      const H = Math.floor(m/60), M = m % 60;
      out.push(`${pad(H)}:${pad(M)}`);
    }
    return out;
  }
  function isHSBoundary(dateKey){
    if (state.selectedService !== 'housesitting') return false;
    const sorted = (state.selectedDates||[]).slice().sort((a,b)=>a-b);
    if (!sorted.length) return false;
    const firstKey = normalizeKey(sorted[0]);
    const lastKey  = normalizeKey(sorted[sorted.length-1]);
    return (dateKey === firstKey || dateKey === lastKey);
  }
  function renderSummary(dateKey){
    const li   = document.querySelector(`.selected-date-item[data-date-id="${CSS.escape(dateKey)}"]`);
    if (!li) return;
    const line = li.querySelector('.times-display') || li.querySelector('.selected-times-line');
    if (!line) return;
    const arr = (state.dateTimes[dateKey] || []).slice().sort((a,b)=>a.time.localeCompare(b.time));
    if (state.selectedService === 'housesitting' && isHSBoundary(dateKey)){
      if (arr.length >= 2) line.textContent = `${fmtLabel(arr[0].time)}–${fmtLabel(arr[1].time)}`;
      else if (arr.length === 1) line.textContent = fmtLabel(arr[0].time);
      else line.textContent = 'No times selected';
    } else {
      line.textContent = arr.length ? arr.map(e => `${fmtLabel(e.time)} ${e.duration||30}m`).join(', ') : 'No times selected';
    }
  }

  // --- HARD REPLACE: always mount inside the given slot; allow HS range ---
  window.openInlineTimePicker = function(dateStr, slotEl){
    const dateKey = normalizeKey(dateStr);
    if (!state.dateTimes) state.dateTimes = {};
    if (!state.dateTimes[dateKey]) state.dateTimes[dateKey] = [];

    // Close other pickers
    document.querySelectorAll('.time-picker-slot .tp-card').forEach(n=>{
      if (n.closest('.time-picker-slot') !== slotEl){ n.parentElement.classList.remove('tp-open'); n.remove(); }
    });

    // Build card in the slot
    slotEl.innerHTML = '';
    slotEl.classList.add('tp-open');

    // Card
    const card = document.createElement('div');
    card.className = 'tp-card';
    card.innerHTML = `
      <div class="tp-head">
        <div class="tp-title">Select Times</div>
        <button type="button" class="tp-done">Done</button>
      </div>
      <div class="tp-list"></div>
      <div class="tp-foot"><div class="tp-empty">Tap times to add. 30m by default.</div></div>
    `;
    slotEl.appendChild(card);

    const listEl = card.querySelector('.tp-list');
    const picked = state.dateTimes[dateKey];

    // Build rows
    timesList().forEach(hhmm => {
      const row = document.createElement('div');
      row.className = 'tp-row';
      row.dataset.time = hhmm;

      const left = document.createElement('div');
      left.textContent = fmtLabel(hhmm);

      const box = document.createElement('div');
      box.className = 'tp-toggle';
      const chip30 = document.createElement('span'); chip30.className = 'tp-chip'; chip30.textContent = '30';
      const chip60 = document.createElement('span'); chip60.className = 'tp-chip'; chip60.textContent = '60';
      const minLbl = document.createElement('span'); minLbl.className = 'tp-min-label'; minLbl.textContent = 'minute';
      box.append(chip30, chip60, minLbl);

      const idx = picked.findIndex(e => e.time === hhmm);
      if (idx !== -1){
        row.classList.add('is-selected');
        (picked[idx].duration === 60 ? chip60 : chip30).classList.add('is-active');
      }

      // Click row: toggle selection
      row.addEventListener('click', (e) => {
        if (e.target === chip30 || e.target === chip60) return; // handled below
        let i = picked.findIndex(e => e.time === hhmm);

        if (state.selectedService === 'housesitting' && isHSBoundary(dateKey)){
          if (i === -1){
            if (picked.length >= 2) return;               // max 2 on boundary
            picked.push({ time: hhmm, duration: 30 });
            picked.sort((a,b)=>a.time.localeCompare(b.time));
          } else {
            picked.splice(i, 1);
          }
        } else {
          if (i === -1){
            picked.push({ time: hhmm, duration: 30 });
            picked.sort((a,b)=>a.time.localeCompare(b.time));
          } else {
            picked.splice(i, 1);
          }
        }
        // Repaint current row quickly
        const sel = picked.find(e => e.time === hhmm);
        row.classList.toggle('is-selected', !!sel);
        chip30.classList.toggle('is-active', sel ? sel.duration !== 60 : false);
        chip60.classList.toggle('is-active', sel ? sel.duration === 60 : false);

        renderSummary(dateKey);
      });

      // Chips: set duration (also select if not yet present, respecting HS max 2)
      function setDur(d){
        let i = picked.findIndex(e => e.time === hhmm);
        if (i === -1){
          if (state.selectedService === 'housesitting' && isHSBoundary(dateKey) && picked.length >= 2) return;
          picked.push({ time: hhmm, duration: d });
          picked.sort((a,b)=>a.time.localeCompare(b.time));
          i = picked.findIndex(e => e.time === hhmm);
        } else {
          picked[i].duration = d;
        }
        row.classList.add('is-selected');
        chip30.classList.toggle('is-active', d === 30);
        chip60.classList.toggle('is-active', d === 60);
        renderSummary(dateKey);
      }
      chip30.addEventListener('click', (e)=>{ e.stopPropagation(); setDur(30); });
      chip60.addEventListener('click', (e)=>{ e.stopPropagation(); setDur(60); });

      row.append(left, box);
      listEl.appendChild(row);
    });

    // Done closes ONLY this picker
    card.querySelector('.tp-done').addEventListener('click', () => {
      slotEl.innerHTML = '';
      slotEl.classList.remove('tp-open');
      state.inlineOpenDateStr = null;
    });

    // Initial summary paint
    renderSummary(dateKey);
  };

  // Ensure "+" opens the inline picker in the right slot even if the slot is missing
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.add-times-btn');
    if (!btn) return;
    const item = btn.closest('.selected-date-item,[data-date-id]');
    if (!item) return;
    const dateKey = item.getAttribute('data-date-id');
    let slot = item.querySelector('.time-picker-slot');
    if (!slot){ slot = document.createElement('div'); slot.className = 'time-picker-slot'; item.appendChild(slot); }
    state.inlineOpenDateStr = dateKey;
    window.openInlineTimePicker(dateKey, slot);
  }, true);
})();

/* ===== ANCHORING AND RANGE FIX ===== */
(function anchoringAndRangeFix(){
  if (window.__tpAnchorFix) return; window.__tpAnchorFix = true;

  let LAST_SLOT = null, LAST_DATE = null;

  function pad(n){ return String(n).padStart(2,'0'); }
  function keyFrom(x){
    if (x instanceof Date) return x.toISOString().split('T')[0];
    if (typeof x === 'number') return new Date(x).toISOString().split('T')[0];
    if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
    const d = new Date(x); return isNaN(d) ? String(x) : d.toISOString().split('T')[0];
  }
  function fmtLabel(hhmm){
    if (typeof window.formatTime === 'function') return formatTime(hhmm);
    const [H,M] = hhmm.split(':').map(Number);
    const ampm = H >= 12 ? 'PM' : 'AM';
    const h12  = ((H + 11) % 12) + 1;
    return `${h12}:${pad(M)} ${ampm}`;
  }
  function isHSBoundary(k){
    if (!window.state) return false;
    if (state.selectedService !== 'housesitting') return false;
    const sorted = (state.selectedDates||[]).slice().sort((a,b)=>a-b);
    if (!sorted.length) return false;
    const first = keyFrom(sorted[0]);
    const last  = keyFrom(sorted[sorted.length-1]);
    return (k === first || k === last);
  }
  function renderSummaryFor(k){
    const li = document.querySelector(`.selected-date-item[data-date-id="${CSS.escape(k)}"]`);
    if (!li) return;
    const line = li.querySelector('.times-display, .selected-times-line');
    if (!line) return;
    const arr = ((state.dateTimes && state.dateTimes[k]) || []).slice().sort((a,b)=>a.time.localeCompare(b.time));
    if (state.selectedService === 'housesitting' && isHSBoundary(k)){
      if (arr.length >= 2) line.textContent = `${fmtLabel(arr[0].time)}–${fmtLabel(arr[1].time)}`;
      else if (arr.length === 1) line.textContent = fmtLabel(arr[0].time);
      else line.textContent = 'No times selected';
    } else {
      line.textContent = arr.length ? arr.map(e => `${fmtLabel(e.time)} ${e.duration||30}m`).join(', ') : 'No times selected';
    }
  }

  /* A) Ensure + opens the picker INSIDE the right card */
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.add-times-btn');
    if (!btn) return;
    const card = btn.closest('.selected-date-item,[data-date-id]');
    if (!card) return;
    LAST_DATE = card.getAttribute('data-date-id');
    LAST_SLOT = card.querySelector('.time-picker-slot') || (function(){
      const d = document.createElement('div'); d.className = 'time-picker-slot'; card.appendChild(d); return d;
    })();

    if (typeof window.openInlineTimePicker === 'function'){
      window.openInlineTimePicker(LAST_DATE, LAST_SLOT);
    }
  }, true);

  /* B) MutationObserver: any .tp-card that appears outside a slot gets moved into LAST_SLOT */
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      for (const n of m.addedNodes){
        if (!(n instanceof Element)) continue;

        // if a picker card wrapper or the card itself was added
        const card = n.matches?.('.tp-card') ? n : (n.querySelector?.('.tp-card') || null);
        if (!card) continue;

        // Already inside a slot?
        const slot = card.closest('.time-picker-slot');
        if (slot) {
          // Force inline sizing just in case
          Object.assign(card.style, {position:'static', inset:'auto', transform:'none', width:'100%', maxWidth:'100%'});
          continue;
        }

        // Not inside a slot: move it under the last clicked slot
        if (LAST_SLOT){
          LAST_SLOT.innerHTML = '';
          LAST_SLOT.classList.add('tp-open');
          LAST_SLOT.appendChild(card);
          Object.assign(card.style, {position:'static', inset:'auto', transform:'none', width:'100%', maxWidth:'100%'});
          // remove stray container if any
          if (n !== card && n.parentNode) { try { n.remove(); } catch(_){} }
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  /* C) Enforce HS "max 2 times on boundary" + range display AFTER any picker click */
  document.addEventListener('click', (e)=>{
    const inCard = e.target.closest('.tp-card');
    if (!inCard) return;
    const item = inCard.closest('.selected-date-item,[data-date-id]');
    if (!item) return;
    const k = item.getAttribute('data-date-id');

    setTimeout(()=>{
      if (!window.state) return;
      if (!state.dateTimes) state.dateTimes = {};
      const arr = (state.dateTimes[k] || []);
      // Trim to two earliest on boundary dates
      if (isHSBoundary(k) && arr.length > 2){
        arr.sort((a,b)=>a.time.localeCompare(b.time));
        state.dateTimes[k] = arr.slice(0,2);
      }
      renderSummaryFor(k);

      // Keep the picker open even if something tried to close it
      if (!item.querySelector('.tp-card') && typeof window.openInlineTimePicker === 'function'){
        const slot = item.querySelector('.time-picker-slot') || (function(){ const d=document.createElement('div'); d.className='time-picker-slot'; item.appendChild(d); return d; })();
        window.openInlineTimePicker(k, slot);
      }
    }, 0);
  }, true);

  /* D) Also re-render summaries after calendar/date changes */
  document.addEventListener('click', (e)=>{
    if (!e.target.closest('.calendar-day,[data-calendar-day]')) return;
    setTimeout(()=>{
      const sel = (state?.selectedDates || []).slice().sort((a,b)=>a-b);
      const first = sel[0] && keyFrom(sel[0]);
      const last  = sel.length && keyFrom(sel[sel.length-1]);
      if (first) renderSummaryFor(first);
      if (last)  renderSummaryFor(last);
    }, 0);
  }, true);
})();

/* ===== ANCHOR PICKER UNDER DATE ===== */
(function anchorPickerUnderDate(){
  if (window.__snoutAnchorV1) return; window.__snoutAnchorV1 = true;

  let LAST_SLOT = null;
  let LAST_DATE = null;

  // Ensure there is a mount slot under the selected date card.
  function getOrCreateSlot(dateItem){
    let slot = dateItem.querySelector('.time-picker-slot');
    if (!slot){
      slot = document.createElement('div');
      slot.className = 'time-picker-slot';
      dateItem.appendChild(slot);
    }
    return slot;
  }

  // Move any stray picker (.tp-card) into the slot we just opened.
  function moveStrayInto(slot){
    // If the slot already has a picker, we're done.
    const existing = slot.querySelector('.tp-card');
    if (existing){
      styleInline(existing);
      return;
    }
    // Find any picker that isn't inside a .time-picker-slot
    const stray = Array.from(document.querySelectorAll('.tp-card'))
      .find(el => !el.closest('.time-picker-slot'));
    if (stray){
      slot.innerHTML = '';
      slot.classList.add('tp-open');
      slot.appendChild(stray);
      styleInline(stray);
    }
  }

  function styleInline(card){
    // guarantee inline sizing/position
    card.style.position = 'static';
    card.style.inset = 'auto';
    card.style.transform = 'none';
    card.style.width = '100%';
    card.style.maxWidth = '100%';
  }

  // A) Intercept the "+" click and remember where to mount
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.add-times-btn');
    if (!btn) return;

    const item = btn.closest('.selected-date-item,[data-date-id]');
    if (!item) return;

    LAST_DATE = item.getAttribute('data-date-id');
    LAST_SLOT = getOrCreateSlot(item);

    // If your app exposes openInlineTimePicker(dateStr, slotEl), use it
    if (typeof window.openInlineTimePicker === 'function'){
      window.openInlineTimePicker(LAST_DATE, LAST_SLOT);
      // If that function still portals to body, pull it back on the next tick:
      setTimeout(()=> moveStrayInto(LAST_SLOT), 0);
    } else {
      // Fallback: if there is already a picker in DOM, move it now
      moveStrayInto(LAST_SLOT);
    }
  }, true);

  // B) MutationObserver — whenever a picker is created anywhere, move it under LAST_SLOT
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      for (const n of m.addedNodes){
        if (!(n instanceof Element)) continue;

        // Handle either the card itself or a wrapper that contains it
        const card = n.matches?.('.tp-card') ? n : (n.querySelector?.('.tp-card') || null);
        if (!card) continue;

        // If already inside a slot, just restyle and continue
        if (card.closest('.time-picker-slot')) { styleInline(card); continue; }

        // Otherwise, if we know the last slot, move it there
        if (LAST_SLOT){
          LAST_SLOT.innerHTML = '';
          LAST_SLOT.classList.add('tp-open');
          LAST_SLOT.appendChild(card);
          styleInline(card);

          // Remove any empty wrapper left behind
          if (n !== card && n.parentNode) { try { n.remove(); } catch(_){} }
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // C) If something else tries to close the picker on selection, re-open in place
  document.addEventListener('click', (e)=>{
    if (!e.target.closest('.tp-card') && !e.target.closest('.add-times-btn')) return;
    // On the next tick, ensure the card still lives inside its slot
    setTimeout(()=>{
      if (!LAST_SLOT) return;
      moveStrayInto(LAST_SLOT);
    }, 0);
  }, true);
})();

/* ===== ANCHOR AND SYNC PICKER ===== */
(function anchorAndSyncPicker(){
  if (window.__snoutAnchorAndSync) return; window.__snoutAnchorAndSync = true;

  let LAST_SLOT = null, LAST_DATE = null;

  // Normalize YYYY-MM-DD keys
  function keyFrom(x){
    if (x instanceof Date) return x.toISOString().split('T')[0];
    if (typeof x === 'number')  return new Date(x).toISOString().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(x))) return String(x);
    const d = new Date(x); return isNaN(d) ? String(x) : d.toISOString().split('T')[0];
  }

  // Put inline card into the right place, never the body
  function styleInline(card){
    card.style.position = 'static';
    card.style.inset = 'auto';
    card.style.transform = 'none';
    card.style.width = '100%';
    card.style.maxWidth = '100%';
  }

  // Create/find the slot under a date card
  function ensureSlot(dateCard){
    let slot = dateCard.querySelector('.time-picker-slot');
    if (!slot){
      slot = document.createElement('div');
      slot.className = 'time-picker-slot';
      dateCard.appendChild(slot);
    }
    return slot;
  }

  // Move any stray .tp-card (if something portaled it) back under the last slot
  function yankStrayBack(){
    if (!LAST_SLOT) return;
    // if the slot already has a card, just restyle
    const existing = LAST_SLOT.querySelector('.tp-card');
    if (existing){ styleInline(existing); return; }
    // otherwise, grab the first card that isn't inside a slot
    const stray = Array.from(document.querySelectorAll('.tp-card'))
      .find(el => !el.closest('.time-picker-slot'));
    if (stray){
      LAST_SLOT.innerHTML = '';
      LAST_SLOT.classList.add('tp-open');
      LAST_SLOT.appendChild(stray);
      styleInline(stray);
    }
  }

  // Sync the inline picker's Map (exposed via getSelectedTimesByDate) back to state.dateTimes
  function syncToState(dateId){
    if (!window.state) window.state = {};
    if (!state.dateTimes) state.dateTimes = {};
    if (typeof window.getSelectedTimesByDate !== 'function') return;

    const all = window.getSelectedTimesByDate();              // { "YYYY-MM-DD": { "05:00":30, ... } }
    const mine = all[dateId] || {};
    const list = Object.keys(mine).sort().map(t => ({ time: t, duration: mine[t] || 30 }));

    // House-sitting: show only first & last, and cap boundary to two times (range)
    const sel = (state.selectedDates || []).slice().sort((a,b)=>a-b);
    const first = sel[0] && keyFrom(sel[0]);
    const last  = sel.length ? keyFrom(sel[sel.length-1]) : null;
    const isHS  = state.selectedService === 'housesitting';
    const isBoundary = isHS && (dateId === first || dateId === last);

    state.dateTimes[dateId] = isBoundary ? list.slice(0, 2) : list;
    // Re-run whatever enables Next in your build
    try { typeof updateNextButton3 === 'function' && updateNextButton3(); } catch(_){}
  }

  // 1) Intercept the "+" click BEFORE the old handler runs
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.add-times-btn');
    if (!btn) return;

    // stop the old openTimeModal handler completely
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();

    const card = btn.closest('[data-date-id]');
    if (!card) return;

    LAST_DATE = card.getAttribute('data-date-id');
    LAST_SLOT = ensureSlot(card);

    if (typeof window.openPickerFor === 'function'){
      window.openPickerFor(LAST_DATE, LAST_SLOT);
      // if something still tries to portal, pull it back next tick
      setTimeout(()=>{ yankStrayBack(); syncToState(LAST_DATE); }, 0);
    }
  }, true); // capture = true so we win

  // 2) If any picker gets added anywhere, move it under LAST_SLOT
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      for (const n of m.addedNodes){
        if (!(n instanceof Element)) continue;
        const card = n.matches?.('.tp-card') ? n : (n.querySelector?.('.tp-card') || null);
        if (!card) continue;
        if (!card.closest('.time-picker-slot')) yankStrayBack();
        else styleInline(card);
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // 3) Any click inside the inline picker → resync state + keep it anchored
  document.addEventListener('click', (e)=>{
    const inCard = e.target.closest('.tp-card');
    if (!inCard) return;

    const owner = inCard.closest('[data-date-id]');
    const k = owner && owner.getAttribute('data-date-id');
    if (!k) return;

    setTimeout(()=>{ yankStrayBack(); syncToState(k); }, 0);
  }, true);

  // 4) Replace openTimeModal with inline behavior (belt & suspenders)
  window.openTimeModal = function(dateId){
    const card = document.querySelector(`[data-date-id="${CSS.escape(dateId)}"]`);
    if (!card) return;
    LAST_DATE = dateId;
    LAST_SLOT = ensureSlot(card);
    if (typeof window.openPickerFor === 'function'){
      window.openPickerFor(LAST_DATE, LAST_SLOT);
      setTimeout(()=>{ yankStrayBack(); syncToState(LAST_DATE); }, 0);
    }
  };
})();

/* === SNOUT INLINE PICKER BEHAVIOR ADD-ON (default 30 + live summary + outside-close) === */
(function(){
  if (window.__snoutPickerAddOnV2) return; window.__snoutPickerAddOnV2 = true;

  // --- helpers ---
  function keyFrom(x){
    if (x instanceof Date) return x.toISOString().split('T')[0];
    if (typeof x === 'number') return new Date(x).toISOString().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(x))) return String(x);
    const d = new Date(x); return isNaN(d) ? String(x) : d.toISOString().split('T')[0];
  }
  function pad(n){ return String(n).padStart(2,'0'); }
  function fmtLabel(hhmm){
    if (typeof window.formatTime === 'function') return formatTime(hhmm);
    const [H,M] = hhmm.split(':').map(Number);
    const ampm = H >= 12 ? 'PM' : 'AM';
    const h12  = ((H + 11) % 12) + 1;
    return `${h12}:${pad(M)} ${ampm}`;
  }
  function isHSBoundary(k){
    if (!window.state) return false;
    if (state.selectedService !== 'housesitting') return false;
    const sel = (state.selectedDates||[]).slice().sort((a,b)=>a-b);
    if (!sel.length) return false;
    const first = keyFrom(sel[0]);
    const last  = keyFrom(sel[sel.length-1]);
    return (k === first || k === last);
  }

  // Live summary render
  function renderSummary(dateKey){
    const li   = document.querySelector(`.selected-date-item[data-date-id="${CSS.escape(dateKey)}"]`);
    if (!li) return;
    const line = li.querySelector('.times-display, .selected-times-line');
    if (!line) return;

    const arr = ((state.dateTimes && state.dateTimes[dateKey]) || []).slice().sort((a,b)=>a.time.localeCompare(b.time));
    if (state.selectedService === 'housesitting' && isHSBoundary(dateKey)){
      if (arr.length >= 2) line.textContent = `${fmtLabel(arr[0].time)}–${fmtLabel(arr[1].time)}`;
      else if (arr.length === 1) line.textContent = fmtLabel(arr[0].time);
      else line.textContent = 'No times selected';
    } else {
      line.textContent = arr.length ? arr.map(e => `${fmtLabel(e.time)} ${e.duration||30}m`).join(', ') : 'No times selected';
    }
  }

  // Default 30m visual state: if a row is selected and no chip marked active, mark 30
  function enforceDefault30In(card){
    card.querySelectorAll('.tp-row.is-selected').forEach(row=>{
      const hasActive = row.querySelector('.tp-chip.is-active');
      if (!hasActive){
        const chips = row.querySelectorAll('.tp-chip');
        if (chips[0]) chips[0].classList.add('is-active');   // assume order: 30 then 60
        if (chips[1]) chips[1].classList.remove('is-active');
      }
    });
  }

  // Sync inline picker -> state.dateTimes, with default duration 30
  function syncToState(dateKey){
    if (!window.state) window.state = {};
    if (!state.dateTimes) state.dateTimes = {};
    if (typeof window.getSelectedTimesByDate !== 'function') return;

    const all = window.getSelectedTimesByDate();  // { "YYYY-MM-DD": { "05:00": 30, ... } }
    const mine = all[dateKey] || {};
    const list = Object.keys(mine).sort().map(t => ({ time: t, duration: mine[t] || 30 }));

    // House-sitting boundary cap (still allow two for range)
    if (isHSBoundary(dateKey) && list.length > 2) list.splice(2);

    state.dateTimes[dateKey] = list;
    renderSummary(dateKey);

    try { typeof updateNextButton3 === 'function' && updateNextButton3(); } catch(_){}
  }

  // Track the currently open slot & date so we can close on outside click
  let OPEN_SLOT = null, OPEN_DATE = null;

  // When a picker opens under a date card, remember it
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.add-times-btn');
    if (!btn) return;
    const card = btn.closest('[data-date-id]');
    if (!card) return;
    OPEN_SLOT = card.querySelector('.time-picker-slot');
    OPEN_DATE = card.getAttribute('data-date-id');
    // next tick: ensure default 30 visuals and live summary
    setTimeout(()=>{
      const tp = OPEN_SLOT && OPEN_SLOT.querySelector('.tp-card');
      if (tp){ enforceDefault30In(tp); syncToState(OPEN_DATE); }
    }, 0);
  }, true);

  // Any click inside the picker should update summary immediately and preserve default 30
  document.addEventListener('click', (e)=>{
    const tp = e.target.closest('.tp-card');
    if (!tp) return;
    const owner = tp.closest('[data-date-id]');
    if (!owner) return;
    const k = owner.getAttribute('data-date-id');
    setTimeout(()=>{
      enforceDefault30In(tp);
      syncToState(k);
    }, 0);
  }, true);

  // Close on Done or click outside (but NOT when clicking the plus or inside the card)
  function closePicker(){
    if (!OPEN_SLOT) return;
    OPEN_SLOT.innerHTML = '';
    OPEN_SLOT.classList.remove('tp-open');
    if (window.state) state.inlineOpenDateStr = null;
    OPEN_SLOT = null; OPEN_DATE = null;
  }

  // Done button
  document.addEventListener('click', (e)=>{
    const done = e.target.closest('.tp-done');
    if (!done) return;
    e.preventDefault();
    closePicker();
  }, true);

  // Outside click
  document.addEventListener('click', (e)=>{
    const tp = document.querySelector('.time-picker-slot .tp-card');
    if (!tp) return;               // no picker open
    if (e.target.closest('.tp-card')) return;            // inside picker
    if (e.target.closest('.add-times-btn')) return;      // plus re-opens in place
    // click elsewhere: close
    closePicker();
  }, true);
})();

/* ===== FINAL INLINE PICKER BEHAVIOR ===== */
(function FINAL_INLINE_PICKER_BEHAVIOR(){
  if (window.__finalInlinePicker) return; window.__finalInlinePicker = true;

  // ---- helpers ----
  function keyFrom(x){
    if (x instanceof Date) return x.toISOString().split('T')[0];
    if (typeof x === 'number') return new Date(x).toISOString().split('T')[0];
    const s = String(x); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s); return isNaN(d) ? s : d.toISOString().split('T')[0];
  }
  function pad(n){ return String(n).padStart(2,'0'); }
  function fmt(hhmm){
    const [H,M] = hhmm.split(':').map(Number);
    const ampm = H >= 12 ? 'PM' : 'AM';
    const h12  = ((H + 11) % 12) + 1;
    return `${h12}:${pad(M)} ${ampm}`;
  }
  function isHSBoundary(dateKey){
    if (!window.state || state.selectedService !== 'housesitting') return false;
    const sel = (state.selectedDates||[]).slice().sort((a,b)=>a-b);
    if (!sel.length) return false;
    const first = keyFrom(sel[0]);
    const last  = keyFrom(sel[sel.length-1]);
    return dateKey === first || dateKey === last;
  }

  // ---- live summary using the picker's Map (window.getSelectedTimesByDate) ----
  function updateSummary(dateKey){
    const card = document.querySelector(`.selected-date-item[data-date-id="${CSS.escape(dateKey)}"]`);
    if (!card) return;
    const line = card.querySelector('.selected-times-line, .times-display');
    if (!line) return;

    let obj = {};
    if (typeof window.getSelectedTimesByDate === 'function'){
      const all = window.getSelectedTimesByDate();
      obj = all?.[dateKey] || {};
    }
    const keys = Object.keys(obj).sort();

    if (state?.selectedService === 'housesitting' && isHSBoundary(dateKey)){
      if (keys.length >= 2) { line.textContent = `${fmt(keys[0])}–${fmt(keys[1])}`; return; }
      if (keys.length === 1){ line.textContent = fmt(keys[0]); return; }
      line.textContent = 'No times selected'; return;
    }

    if (!keys.length){ line.textContent = 'No times selected'; return; }
    line.textContent = keys.map(k => `${fmt(k)} ${(obj[k] || 30)}m`).join(', ');
  }

  // ---- default 30m on select (UI chips) ----
  function enforceDefault30(cardEl){
    cardEl.querySelectorAll('.tp-row.is-selected').forEach(row=>{
      const hasActive = row.querySelector('.tp-chip.is-active');
      if (!hasActive){
        const chips = row.querySelectorAll('.tp-chip');
        if (chips[0]) chips[0].classList.add('is-active'); // first chip is 30
        if (chips[1]) chips[1].classList.remove('is-active');
      }
    });
  }

  // keep reference to open card/slot/date for closing
  let OPEN_CARD = null, OPEN_SLOT = null, OPEN_DATE = null;
  function rememberOpen(card){
    OPEN_CARD = card;
    OPEN_SLOT = card.closest('.time-picker-slot');
    const owner = card.closest('[data-date-id]');
    OPEN_DATE = owner && owner.getAttribute('data-date-id');
  }
  function cleanClose(){
    if (!OPEN_SLOT) return;
    OPEN_SLOT.innerHTML = '';
    OPEN_SLOT.classList.remove('tp-open');
    if (window.state) state.inlineOpenDateStr = null;
    OPEN_CARD = OPEN_SLOT = OPEN_DATE = null;
  }

  // 1) After any picker opens, mark default 30 and render summary immediately
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      for (const n of m.addedNodes){
        if (!(n instanceof Element)) continue;
        const card = n.matches?.('.tp-card') ? n : n.querySelector?.('.tp-card');
        if (!card) continue;
        // ensure inline
        card.style.position = 'static'; card.style.inset = 'auto'; card.style.transform = 'none';
        card.style.width = '100%'; card.style.maxWidth = '100%';
        rememberOpen(card);
        setTimeout(()=>{
          enforceDefault30(card);
          if (OPEN_DATE) updateSummary(OPEN_DATE);
        }, 0);
      }
    }
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  // 2) Any tap inside the picker -> refresh summary (and keep default 30 visual)
  document.addEventListener('click', (e)=>{
    const card = e.target.closest('.tp-card');
    if (!card) return;
    rememberOpen(card);
    setTimeout(()=>{
      enforceDefault30(card);
      if (OPEN_DATE) updateSummary(OPEN_DATE);
      try { typeof updateNextButton3 === 'function' && updateNextButton3(); } catch(_){}
    }, 0);
  }, true);

  // 3) Close on Done
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.tp-done');
    if (!btn) return;
    e.preventDefault();
    cleanClose();
  }, true);

  // 4) Close on clicking outside (but not when clicking + or inside the picker)
  document.addEventListener('click', (e)=>{
    const card = document.querySelector('.time-picker-slot .tp-card');
    if (!card) return; // nothing open
    if (e.target.closest('.tp-card')) return;
    if (e.target.closest('.add-times-btn')) return;
    cleanClose();
  }, true);

  // 5) Make sure the + button routes to inline picker (block legacy modal)
  document.addEventListener('click', (e)=>{
    const plus = e.target.closest('.add-times-btn');
    if (!plus) return;
    // stop any old handler that opened a modal
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    e.stopPropagation(); e.preventDefault();

    const item = plus.closest('[data-date-id]');
    if (!item) return;
    const dateId = item.getAttribute('data-date-id');
    let slot = item.querySelector('.time-picker-slot');
    if (!slot){ slot = document.createElement('div'); slot.className = 'time-picker-slot'; item.appendChild(slot); }

    if (typeof window.openPickerFor === 'function'){
      window.openPickerFor(dateId, slot);
      setTimeout(()=>{
        const card = slot.querySelector('.tp-card'); if (card) rememberOpen(card);
        if (card) { enforceDefault30(card); updateSummary(dateId); }
      }, 0);
    }
  }, true);
})();

/* ===== SELECTED TIMES + CLOSE BEHAVIOR (STATE-driven) ===== */
(function(){
  if (window.__snoutStateSummaryClose) return; window.__snoutStateSummaryClose = true;

  // ---- helpers ----
  function keyFrom(x){
    if (x instanceof Date) return x.toISOString().split('T')[0];
    if (typeof x === 'number') return new Date(x).toISOString().split('T')[0];
    const s = String(x); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s); return isNaN(d) ? s : d.toISOString().split('T')[0];
  }
  function pad(n){ return String(n).padStart(2,'0'); }
  function fmt(hhmm){
    const [H,M] = hhmm.split(':').map(Number);
    const ampm = H >= 12 ? 'PM' : 'AM';
    const h12  = ((H + 11) % 12) + 1;
    return `${h12}:${pad(M)} ${ampm}`;
  }
  function isHSBoundary(dateKey){
    if (!window.state || state.selectedService !== 'housesitting') return false;
    const sel = (state.selectedDates||[]).slice().sort((a,b)=>a-b);
    if (!sel.length) return false;
    const first = keyFrom(sel[0]);
    const last  = keyFrom(sel[sel.length-1]);
    return (dateKey === first || dateKey === last);
  }

  // Read selected times from your inline picker's STATE Map
  function readSelected(dateKey){
    const map = (window.STATE && window.STATE.get(dateKey)) || null;
    const out = [];
    if (map && typeof map.forEach === 'function'){
      map.forEach((val, time) => {
        const selected = (val && (val.selected === true || val.sel === true)) || val === true;
        if (!selected) return;
        const dur = (val && (val.duration || val.minutes || val.dur)) || 30; // default 30
        out.push({ time, duration: dur });
      });
    }
    out.sort((a,b)=>a.time.localeCompare(b.time));
    return out;
  }

  // Write summary line + keep state.dateTimes in sync (so Next works)
  function updateSummaryAndState(dateKey){
    const arr = readSelected(dateKey);

    if (!window.state) window.state = {};
    if (!state.dateTimes) state.dateTimes = {};

    if (isHSBoundary(dateKey) && arr.length > 2) arr.length = 2; // cap for range
    state.dateTimes[dateKey] = arr.slice();

    const card = document.querySelector(`.selected-date-item[data-date-id="${CSS.escape(dateKey)}"]`);
    if (card){
      const line = card.querySelector('.selected-times-line, .times-display');
      if (line){
        if (state.selectedService === 'housesitting' && isHSBoundary(dateKey)){
          if (arr.length >= 2) line.textContent = `${fmt(arr[0].time)}–${fmt(arr[1].time)}`;
          else if (arr.length === 1) line.textContent = fmt(arr[0].time);
          else line.textContent = 'No times selected';
        } else {
          line.textContent = arr.length ? arr.map(x=>`${fmt(x.time)} ${x.duration||30}m`).join(', ') : 'No times selected';
        }
      }
    }
    try { typeof updateNextButton3 === 'function' && updateNextButton3(); } catch(_){}
  }

  // Default 30m on plain row click (no chip)
  function ensureDefault30(dateKey, rowEl){
    if (!window.STATE) return;
    const map = STATE.get(dateKey);
    if (!map || !rowEl) return;
    const t = rowEl.getAttribute('data-time');
    if (!t) return;
    const cur = map.get(t);
    // If user just selected this time and no duration was set, enforce 30m
    if (cur === true || (cur && cur.selected && !('duration' in cur))){
      map.set(t, { selected: true, duration: 30 });
    }
  }

  // Track the currently open picker for outside-click close
  let OPEN_SLOT = null, OPEN_DATE = null;

  // Remember open picker (called when a .tp-card appears)
  function rememberOpen(){
    const card = document.querySelector('.time-picker-slot .tp-card');
    if (!card) return;
    OPEN_SLOT = card.closest('.time-picker-slot');
    const owner = card.closest('[data-date-id]');
    OPEN_DATE = owner && owner.getAttribute('data-date-id');
  }

  // Close the inline picker
  function closePicker(){
    if (!OPEN_SLOT) return;
    OPEN_SLOT.innerHTML = '';
    OPEN_SLOT.classList.remove('tp-open');
    if (window.state) state.inlineOpenDateStr = null;
    OPEN_SLOT = null; OPEN_DATE = null;
  }

  // When picker DOM appears, remember and render summary immediately
  const mo = new MutationObserver(()=>{
    rememberOpen();
    if (OPEN_DATE) updateSummaryAndState(OPEN_DATE);
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  // Inside picker: on any click, enforce default 30 (if needed) and refresh summary
  document.addEventListener('click', (e)=>{
    const card = e.target.closest('.tp-card');
    if (!card) return;
    const row  = e.target.closest('.tp-row'); // has data-time
    const owner = card.closest('[data-date-id]');
    const k = owner && owner.getAttribute('data-date-id');
    if (!k) return;

    if (row) ensureDefault30(k, row);
    setTimeout(()=> updateSummaryAndState(k), 0);
  }, true);

  // Done button closes picker
  document.addEventListener('click', (e)=>{
    const done = e.target.closest('.tp-done, .tp-close, [data-tp-close]');
    if (!done) return;
    e.preventDefault();
    closePicker();
  }, true);

  // Click outside closes picker (but not when clicking inside or on the + button)
  document.addEventListener('click', (e)=>{
    const card = document.querySelector('.time-picker-slot .tp-card');
    if (!card) return;                        // nothing open
    if (e.target.closest('.tp-card')) return; // inside picker
    if (e.target.closest('.add-times-btn')) return; // plus opens/reopens
    closePicker();
  }, true);

  // Also refresh summary when the + opens a picker (so it shows immediately)
  document.addEventListener('click', (e)=>{
    const plus = e.target.closest('.add-times-btn');
    if (!plus) return;
    setTimeout(()=>{ rememberOpen(); if (OPEN_DATE) updateSummaryAndState(OPEN_DATE); }, 0);
  }, true);
})();

/* ==== FINAL SUMMARY + CLOSE PATCH (STATE-aware, service-agnostic) ==== */
(function(){
  if (window.__snoutSummaryCloseV3) return; window.__snoutSummaryCloseV3 = true;

  // --- helpers ---
  function keyFrom(x){
    if (x instanceof Date) return x.toISOString().split('T')[0];
    if (typeof x === 'number') return new Date(x).toISOString().split('T')[0];
    const s = String(x); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s); return isNaN(d) ? s : d.toISOString().split('T')[0];
  }
  function pad(n){ return String(n).padStart(2,'0'); }
  function fmt(hhmm){
    const [H,M] = hhmm.split(':').map(Number);
    const ampm = H >= 12 ? 'PM' : 'AM';
    const h12  = ((H + 11) % 12) + 1;
    return `${h12}:${pad(M)} ${ampm}`;
  }
  function isHSBoundary(dateKey){
    if (!window.state || state.selectedService !== 'housesitting') return false;
    const sel = (state.selectedDates||[]).slice().sort((a,b)=>a-b);
    if (!sel.length) return false;
    const first = keyFrom(sel[0]);
    const last  = keyFrom(sel[sel.length-1]);
    return (dateKey === first || dateKey === last);
  }
  function findDateCard(dateKey){
    return document.querySelector(`.selected-date-item[data-date-id="${CSS.escape(dateKey)}"]`);
  }
  function findSummaryEl(card){
    return card.querySelector('.selected-times-line, .times-display, .selected-times, [data-selected-times]');
  }

  // --- read selections (prefer STATE Map, else DOM) ---
  function readSelections(dateKey){
    // 1) STATE Map path
    if (window.STATE && typeof STATE.get === 'function'){
      // Try direct key
      let map = STATE.get(dateKey);
      // If keys differ (e.g., Date objects), find one that normalizes to the same
      if (!map){
        for (const k of STATE.keys()){
          try {
            if (keyFrom(k) === dateKey){ map = STATE.get(k); break; }
          } catch(_) {}
        }
      }
      if (map && typeof map.forEach === 'function'){
        const out = [];
        map.forEach((v, t) => {
          const sel = (v === true) || (v && (v.selected || v.sel));
          if (!sel) return;
          const dur = (v && (v.duration ?? v.minutes ?? v.dur)) ?? 30; // default 30m
          out.push({ time: t, duration: dur });
        });
        out.sort((a,b)=>a.time.localeCompare(b.time));
        return out;
      }
    }

    // 2) DOM fallback path (scan inline picker rows)
    const card = findDateCard(dateKey);
    const picker = card && card.querySelector('.time-picker-slot .tp-card');
    const rows = picker ? Array.from(picker.querySelectorAll('.tp-row')) : [];
    const out2 = [];
    for (const r of rows){
      const selected = r.classList.contains('is-selected') || r.classList.contains('selected') || r.getAttribute('aria-selected') === 'true';
      if (!selected) continue;
      const t = r.getAttribute('data-time') || r.querySelector('[data-time]')?.getAttribute('data-time');
      if (!t) continue;
      // duration chip
      let dur = 30;
      const chip60 = r.querySelector('.tp-chip.is-active, .tp-chip.active, [data-chip="60"].active, [data-duration="60"].is-active');
      if (chip60 && /60/.test(chip60.textContent || '60')) dur = 60;
      out2.push({ time: t, duration: dur });
    }
    out2.sort((a,b)=>a.time.localeCompare(b.time));
    return out2;
  }

  // --- write summary + sync state.dateTimes ---
  function writeSummary(dateKey){
    const arr = readSelections(dateKey);

    if (!window.state) window.state = {};
    if (!state.dateTimes) state.dateTimes = {};

    // HS: cap boundary to two (range)
    const arrCapped = (isHSBoundary(dateKey) && arr.length > 2) ? arr.slice(0,2) : arr.slice();
    state.dateTimes[dateKey] = arrCapped;

    const card = findDateCard(dateKey);
    const line = card && findSummaryEl(card);
    if (line){
      if (state.selectedService === 'housesitting' && isHSBoundary(dateKey)){
        if (arrCapped.length >= 2) line.textContent = `${fmt(arrCapped[0].time)}–${fmt(arrCapped[1].time)}`;
        else if (arrCapped.length === 1) line.textContent = fmt(arrCapped[0].time);
        else line.textContent = 'No times selected';
      } else {
        line.textContent = arrCapped.length ? arrCapped.map(x => `${fmt(x.time)} ${(x.duration ?? 30)}m`).join(', ') : 'No times selected';
      }
    }
    try { typeof updateNextButton3 === 'function' && updateNextButton3(); } catch(_){}
  }

  // --- track open picker to support outside-close ---
  let OPEN_SLOT = null, OPEN_DATE = null;
  function rememberOpenFrom(el){
    const card = el.closest('.time-picker-slot .tp-card') ? el.closest('.time-picker-slot') : el.querySelector?.('.time-picker-slot');
    const owner = el.closest?.('[data-date-id]') || document.querySelector('.time-picker-slot .tp-card')?.closest('[data-date-id]');
    if (!card || !owner) return;
    OPEN_SLOT = card;
    OPEN_DATE = owner.getAttribute('data-date-id');
  }
  function closePicker(){
    if (!OPEN_SLOT) return;
    OPEN_SLOT.innerHTML = '';
    OPEN_SLOT.classList.remove('tp-open');
    if (window.state) state.inlineOpenDateStr = null;
    OPEN_SLOT = null; OPEN_DATE = null;
  }

  // A) Whenever a picker appears, remember it and immediately render summary
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      for (const n of m.addedNodes){
        if (!(n instanceof Element)) continue;
        const card = n.matches?.('.tp-card') ? n : n.querySelector?.('.tp-card');
        if (!card) continue;
        // force inline sizing (belt & suspenders)
        Object.assign(card.style, { position:'static', inset:'auto', transform:'none', width:'100%', maxWidth:'100%' });
        rememberOpenFrom(card);
        if (OPEN_DATE) writeSummary(OPEN_DATE);
      }
    }
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  // B) Any interaction inside the picker → recompute summary (and default 30m)
  document.addEventListener('click', (e)=>{
    const card = e.target.closest('.tp-card');
    if (!card) return;
    rememberOpenFrom(card);

    // Default 30m if a time was just toggled on without a duration
    try {
      const owner = card.closest('[data-date-id]');
      const k = owner && owner.getAttribute('data-date-id');
      if (k && window.STATE){
        const map = STATE.get(k) || (()=>{ // normalize keys if needed
          for (const kk of STATE.keys()){ if (keyFrom(kk) === k) return STATE.get(kk); }
          return null;
        })();
        if (map){
          map.forEach((v, t) => {
            const sel = (v === true) || (v && (v.selected || v.sel));
            if (!sel) return;
            if (v === true) map.set(t, { selected:true, duration:30 });
            else if (v && v.selected && typeof v.duration === 'undefined') v.duration = 30;
          });
        }
      }
    } catch(_){}

    setTimeout(()=> { if (OPEN_DATE) writeSummary(OPEN_DATE); }, 0);
  }, true);

  // C) Close on Done
  document.addEventListener('click', (e)=>{
    const done = e.target.closest('.tp-done, .tp-close, [data-tp-close], button, a');
    if (!done) return;
    // Match by visible text if needed
    const txt = (done.textContent || '').trim().toLowerCase();
    if (!done.matches('.tp-done, .tp-close, [data-tp-close]') && txt !== 'done') return;
    e.preventDefault();
    closePicker();
  }, true);

  // D) Close on clicking outside (but not when clicking inside picker or on the +)
  document.addEventListener('click', (e)=>{
    const hasOpen = document.querySelector('.time-picker-slot .tp-card');
    if (!hasOpen) return;
    if (e.target.closest('.tp-card')) return;
    if (e.target.closest('.add-times-btn')) return;
    closePicker();
  }, true);

  // E) When + opens a picker, remember and prime summary right away
  document.addEventListener('click', (e)=>{
    const plus = e.target.closest('.add-times-btn');
    if (!plus) return;
    const item = plus.closest('[data-date-id]');
    if (!item) return;
    setTimeout(()=>{
      const slot = item.querySelector('.time-picker-slot');
      if (!slot) return;
      rememberOpenFrom(slot);
      const k = item.getAttribute('data-date-id');
      if (k) writeSummary(k);
    }, 0);
  }, true);
})();

/* === DOM-SYNC FOR SELECTED TIMES + DEFAULT 30 + CLOSE === */
(function(){
  if (window.__snoutDomSyncV1) return; window.__snoutDomSyncV1 = true;

  // helpers
  function pad(n){ return String(n).padStart(2,'0'); }
  function fmt(hhmm){
    const [H,M] = hhmm.split(':').map(Number);
    const ampm = H >= 12 ? 'PM' : 'AM';
    const h12  = ((H + 11) % 12) + 1;
    return `${h12}:${pad(M)} ${ampm}`;
  }
  function keyFrom(x){
    if (x instanceof Date) return x.toISOString().split('T')[0];
    if (typeof x === 'number') return new Date(x).toISOString().split('T')[0];
    const s = String(x); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s); return isNaN(d) ? s : d.toISOString().split('T')[0];
  }
  function isHSBoundary(k){
    if (!window.state || state.selectedService !== 'housesitting') return false;
    const sorted = (state.selectedDates||[]).slice().sort((a,b)=>a-b);
    if (!sorted.length) return false;
    const first = keyFrom(sorted[0]);
    const last  = keyFrom(sorted[sorted.length-1]);
    return (k === first || k === last);
  }

  // find the summary element, or create one if missing (non-destructive)
  function findOrCreateSummaryEl(card){
    let el = card.querySelector('.selected-times-line, .times-display, .selected-times, [data-selected-times]');
    if (!el){
      const row = card.querySelector('.selected-date-row') || card;
      el = document.createElement('div');
      el.className = 'selected-times-line';
      row.appendChild(el);
    }
    return el;
  }

  // read selected rows from the picker DOM (class-based)
  function readSelectedFromDOM(card){
    const rows = card.querySelectorAll('.tp-row, [data-time]');
    const out = [];
    rows.forEach(r=>{
      const selected = r.classList.contains('is-selected') || r.classList.contains('selected') || r.getAttribute('aria-selected') === 'true';
      if (!selected) return;
      const t = r.getAttribute('data-time') || r.dataset.time;
      if (!t) return;

      // find an active 60 chip if any; otherwise default 30
      let dur = 30;
      const chipActive = r.querySelector('.tp-chip.is-active, .tp-chip.active, [data-duration="60"].is-active, [data-chip="60"].active');
      if (chipActive && /60/.test(chipActive.textContent || '')) dur = 60;

      out.push({ time: t, duration: dur });
    });
    out.sort((a,b)=>a.time.localeCompare(b.time));
    return out;
  }

  // write summary and keep state.dateTimes in sync so Next logic works
  function writeSummary(card){
    const dateKey = card.getAttribute('data-date-id');
    if (!dateKey) return;

    const picker = card.querySelector('.time-picker-slot .tp-card');
    if (!picker) return;

    const arr = readSelectedFromDOM(picker);

    if (!window.state) window.state = {};
    if (!state.dateTimes) state.dateTimes = {};

    // HS: cap to 2 on first/last to form a range
    const finalArr = (isHSBoundary(dateKey) && arr.length > 2) ? arr.slice(0,2) : arr;

    state.dateTimes[dateKey] = finalArr.slice();

    const line = findOrCreateSummaryEl(card);
    if (state.selectedService === 'housesitting' && isHSBoundary(dateKey)){
      if (finalArr.length >= 2)      line.textContent = `${fmt(finalArr[0].time)}–${fmt(finalArr[1].time)}`;
      else if (finalArr.length === 1) line.textContent = fmt(finalArr[0].time);
      else                            line.textContent = 'No times selected';
    } else {
      line.textContent = finalArr.length ? finalArr.map(x => `${fmt(x.time)} ${x.duration||30}m`).join(', ') : 'No times selected';
    }

    try { typeof updateNextButton3 === 'function' && updateNextButton3(); } catch(_){}
  }

  // remember current open picker so outside-click can close it
  let OPEN_SLOT = null;
  function rememberOpen(cardEl){
    const slot = cardEl.closest('.time-picker-slot') || cardEl.querySelector?.('.time-picker-slot');
    if (slot) OPEN_SLOT = slot;
  }
  function closeOpenPicker(){
    if (!OPEN_SLOT) return;
    OPEN_SLOT.innerHTML = '';
    OPEN_SLOT.classList.remove('tp-open');
    if (window.state) state.inlineOpenDateStr = null;
    OPEN_SLOT = null;
  }

  // A) When a picker appears anywhere, restyle inline and prime summary
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      for (const n of m.addedNodes){
        if (!(n instanceof Element)) continue;
        const tp = n.matches?.('.tp-card') ? n : (n.querySelector?.('.tp-card') || null);
        if (!tp) continue;
        // force inline placement (belt & suspenders)
        tp.style.position='static'; tp.style.inset='auto'; tp.style.transform='none'; tp.style.width='100%'; tp.style.maxWidth='100%';
        const card = tp.closest('.selected-date-item,[data-date-id]');
        if (card){
          rememberOpen(tp);
          writeSummary(card);
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  // B) Any interaction inside the picker → rewrite summary immediately
  document.addEventListener('click', (e)=>{
    const tp = e.target.closest('.tp-card');
    if (!tp) return;
    const card = tp.closest('.selected-date-item,[data-date-id]');
    if (!card) return;
    rememberOpen(tp);
    // next tick so the highlight classes have applied
    setTimeout(()=> writeSummary(card), 0);
  }, true);

  // C) Close picker on Done
  document.addEventListener('click', (e)=>{
    const done = e.target.closest('.tp-done, .tp-close, [data-tp-close], button, a');
    if (!done) return;
    const txt = (done.textContent || '').trim().toLowerCase();
    if (!done.matches('.tp-done, .tp-close, [data-tp-close]') && txt !== 'done') return;
    e.preventDefault();
    closeOpenPicker();
  }, true);

  // D) Close picker on outside click (but not on + or inside)
  document.addEventListener('click', (e)=>{
    const open = document.querySelector('.time-picker-slot .tp-card');
    if (!open) return;
    if (e.target.closest('.tp-card')) return;
    if (e.target.closest('.add-times-btn')) return;
    closeOpenPicker();
  }, true);

  // E) When + opens a picker, make sure we'll update summary right away
  document.addEventListener('click', (e)=>{
    const plus = e.target.closest('.add-times-btn');
    if (!plus) return;
    const card = plus.closest('.selected-date-item,[data-date-id]');
    if (!card) return;
    setTimeout(()=> writeSummary(card), 0);
  }, true);
})();

/* ==== FINAL SAVE-ON-CLOSE PATCH (commits to STATE + state.dateTimes) ==== */
(function(){
  if (window.__snoutSaveCommitV1) return; window.__snoutSaveCommitV1 = true;

  // --- helpers ---
  function pad(n){ return String(n).padStart(2,'0'); }
  function fmt(hhmm){
    const [H,M] = hhmm.split(':').map(Number);
    const ampm = H >= 12 ? 'PM' : 'AM';
    const h12  = ((H + 11) % 12) + 1;
    return `${h12}:${pad(M)} ${ampm}`;
  }
  function keyFrom(x){
    if (x instanceof Date) return x.toISOString().split('T')[0];
    if (typeof x === 'number') return new Date(x).toISOString().split('T')[0];
    const s = String(x); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s); return isNaN(d) ? s : d.toISOString().split('T')[0];
  }
  function isHSBoundary(dateKey){
    if (!window.state || state.selectedService !== 'housesitting') return false;
    const sel = (state.selectedDates||[]).slice().sort((a,b)=>a-b);
    if (!sel.length) return false;
    const first = keyFrom(sel[0]); const last = keyFrom(sel[sel.length-1]);
    return (dateKey === first || dateKey === last);
  }
  function findDateCardByKey(k){ return document.querySelector(`.selected-date-item[data-date-id="${CSS.escape(k)}"]`); }
  function findSummaryEl(card){
    return card.querySelector('.selected-times-line, .times-display, .selected-times, [data-selected-times]');
  }

  // Read current selections from the visible picker DOM (not relying on any internal store)
  function readSelectedFromDOM(pickerEl){
    const rows = pickerEl ? Array.from(pickerEl.querySelectorAll('.tp-row, [data-time]')) : [];
    const out = [];
    for (const r of rows){
      const selected = r.classList.contains('is-selected') || r.classList.contains('selected') || r.getAttribute('aria-selected') === 'true';
      if (!selected) continue;
      const t = r.getAttribute('data-time') || r.dataset.time;
      if (!t) continue;
      // duration default 30 unless a 60 chip is active
      let dur = 30;
      const chip60 = r.querySelector('.tp-chip.is-active, .tp-chip.active, [data-duration="60"].is-active, [data-chip="60"].active');
      if (chip60 && /60/.test(chip60.textContent || '')) dur = 60;
      out.push({ time: t, duration: dur });
    }
    out.sort((a,b)=>a.time.localeCompare(b.time));
    return out;
  }

  // Commit the DOM selection to STATE (picker's Map) + state.dateTimes; update the summary line
  function commitAndRender(dateKey){
    const card = findDateCardByKey(dateKey);
    if (!card) return;
    const picker = card.querySelector('.time-picker-slot .tp-card');
    if (!picker) return;

    // 1) read from DOM
    const arr = readSelectedFromDOM(picker);

    // 2) mirror into STATE Map (so re-opening persists)
    if (!window.STATE) window.STATE = new Map();
    let map = STATE.get(dateKey);
    if (!map) { map = new Map(); STATE.set(dateKey, map); }
    // clear anything not selected now
    const keep = new Set(arr.map(x=>x.time));
    for (const k of Array.from(map.keys())) if (!keep.has(k)) map.delete(k);
    // set current selections
    arr.forEach(x => map.set(x.time, { selected: true, duration: x.duration }));

    // 3) mirror into state.dateTimes (so Next logic & other UI work)
    if (!window.state) window.state = {};
    if (!state.dateTimes) state.dateTimes = {};

    const finalArr = (isHSBoundary(dateKey) && arr.length > 2) ? arr.slice(0,2) : arr.slice();
    state.dateTimes[dateKey] = finalArr;

    // 4) update the visible summary
    const line = findSummaryEl(card);
    if (line){
      if (state.selectedService === 'housesitting' && isHSBoundary(dateKey)){
        if (finalArr.length >= 2)      line.textContent = `${fmt(finalArr[0].time)}–${fmt(finalArr[1].time)}`;
        else if (finalArr.length === 1) line.textContent = fmt(finalArr[0].time);
        else                            line.textContent = 'No times selected';
      } else {
        line.textContent = finalArr.length ? finalArr.map(x => `${fmt(x.time)} ${x.duration||30}m`).join(', ') : 'No times selected';
      }
    }

    // 5) optional: persist to hidden input if you have one
    const hidden = document.querySelector('input[name="selected_times"], input[name="times_json"], #selectedTimesJSON');
    if (hidden){ try { hidden.value = JSON.stringify(state.dateTimes); } catch(_){} }

    try { typeof updateNextButton3 === 'function' && updateNextButton3(); } catch(_){}
  }

  // Close the inline picker under a given card
  function closePickerFor(dateKey){
    const card = findDateCardByKey(dateKey);
    if (!card) return;
    const slot = card.querySelector('.time-picker-slot');
    if (!slot) return;
    slot.innerHTML = '';
    slot.classList.remove('tp-open');
    if (window.state) state.inlineOpenDateStr = null;
  }

  // Remember current open (so outside-click can find it)
  function getOpenDateKey(){
    const open = document.querySelector('.time-picker-slot .tp-card');
    if (!open) return null;
    const owner = open.closest('[data-date-id]');
    return owner ? owner.getAttribute('data-date-id') : null;
  }

  // A) On any click inside the picker, commit immediately (keeps summary/live state correct)
  document.addEventListener('click', (e)=>{
    const tp = e.target.closest('.tp-card');
    if (!tp) return;
    const owner = tp.closest('[data-date-id]');
    if (!owner) return;
    const k = owner.getAttribute('data-date-id');
    // next tick after highlight classes apply
    setTimeout(()=> commitAndRender(k), 0);
  }, true);

  // B) Done button: commit and close
  document.addEventListener('click', (e)=>{
    const done = e.target.closest('.tp-done, .tp-close, [data-tp-close], button, a');
    if (!done) return;
    const txt = (done.textContent || '').trim().toLowerCase();
    if (!done.matches('.tp-done, .tp-close, [data-tp-close]') && txt !== 'done') return;
    e.preventDefault();
    const k = getOpenDateKey();
    if (k){ commitAndRender(k); closePickerFor(k); }
  }, true);

  // C) Click outside: commit and close (but ignore clicks on + or inside)
  document.addEventListener('click', (e)=>{
    const openCard = document.querySelector('.time-picker-slot .tp-card');
    if (!openCard) return;
    if (e.target.closest('.tp-card')) return;
    if (e.target.closest('.add-times-btn')) return;
    const k = getOpenDateKey();
    if (k){ commitAndRender(k); closePickerFor(k); }
  }, true);

  // D) When + opens a picker, prime the summary from current state (if any)
  document.addEventListener('click', (e)=>{
    const plus = e.target.closest('.add-times-btn');
    if (!plus) return;
    setTimeout(()=>{
      const k = getOpenDateKey();
      if (!k) return;
      commitAndRender(k); // writes current selection immediately so it shows even before edits
    }, 0);
  }, true);
})();

/* ===== SNOUT: SAVE PICKS ON DONE/OUTSIDE + RESTORE ON OPEN (final) ===== */
(function(){
  if (window.__snoutCommitRestoreV1) return; window.__snoutCommitRestoreV1 = true;

  // ---------- helpers ----------
  function pad(n){ return String(n).padStart(2,'0'); }
  function fmt(hhmm){
    const [H,M] = hhmm.split(':').map(Number);
    const ampm = H >= 12 ? 'PM' : 'AM';
    const h12  = ((H + 11) % 12) + 1;
    return `${h12}:${pad(M)} ${ampm}`;
  }
  function keyFrom(x){
    if (x instanceof Date) return x.toISOString().split('T')[0];
    if (typeof x === 'number') return new Date(x).toISOString().split('T')[0];
    const s = String(x); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s); return isNaN(d) ? s : d.toISOString().split('T')[0];
  }
  function isHSBoundary(k){
    if (!window.state || state.selectedService !== 'housesitting') return false;
    const sel = (state.selectedDates||[]).slice().sort((a,b)=>a-b);
    if (!sel.length) return false;
    const first = keyFrom(sel[0]);
    const last  = keyFrom(sel[sel.length-1]);
    return k === first || k === last;
  }
  function getOpenCard(){ return document.querySelector('.time-picker-slot .tp-card'); }
  function getOpenDateKey(){
    const card = getOpenCard(); if (!card) return null;
    const owner = card.closest('[data-date-id]');
    return owner ? owner.getAttribute('data-date-id') : (card.dataset.dateKey || null);
  }
  function summaryElFor(dateKey){
    const card = document.querySelector(`.selected-date-item[data-date-id="${CSS.escape(dateKey)}"]`);
    return card ? (card.querySelector('.selected-times-line, .times-display, .selected-times, [data-selected-times]') || card) : null;
  }

  // ---------- read/write ----------
  function readSelectedFromDOM(pickerEl){
    const rows = pickerEl ? Array.from(pickerEl.querySelectorAll('.tp-row, [data-time]')) : [];
    const out = [];
    for (const r of rows){
      const selected = r.classList.contains('is-selected') || r.classList.contains('selected') || r.getAttribute('aria-selected') === 'true';
      if (!selected) continue;
      const t = r.getAttribute('data-time') || r.dataset.time;
      if (!t) continue;
      // default 30 unless a 60 chip is active
      let dur = 30;
      const chip60 = r.querySelector('.tp-chip.is-active, .tp-chip.active, [data-duration="60"].is-active, [data-chip="60"].active');
      if (chip60 && /60/.test(chip60.textContent || '')) dur = 60;
      out.push({ time: t, duration: dur });
    }
    out.sort((a,b)=>a.time.localeCompare(b.time));
    return out;
  }

  function commitToSTATE(dateKey, arr){
    if (!window.STATE) window.STATE = new Map();
    let map = STATE.get(dateKey);
    if (!map){ map = new Map(); STATE.set(dateKey, map); }
    // wipe + set fresh snapshot
    for (const k of Array.from(map.keys())) map.delete(k);
    arr.forEach(x => map.set(x.time, { selected:true, duration:x.duration }));
  }

  function commitToStateDateTimes(dateKey, arr){
    if (!window.state) window.state = {};
    if (!state.dateTimes) state.dateTimes = {};
    const finalArr = (isHSBoundary(dateKey) && arr.length > 2) ? arr.slice(0,2) : arr.slice();
    state.dateTimes[dateKey] = finalArr;
  }

  function renderSummary(dateKey){
    const arr = (state?.dateTimes?.[dateKey] || []).slice().sort((a,b)=>a.time.localeCompare(b.time));
    const line = summaryElFor(dateKey);
    if (!line) return;
    if (state?.selectedService === 'housesitting' && isHSBoundary(dateKey)){
      if (arr.length >= 2) line.textContent = `${fmt(arr[0].time)}–${fmt(arr[1].time)}`;
      else if (arr.length === 1) line.textContent = fmt(arr[0].time);
      else line.textContent = 'No times selected';
    } else {
      line.textContent = arr.length ? arr.map(x => `${fmt(x.time)} ${x.duration||30}m`).join(', ') : 'No times selected';
    }
  }

  function commitAll(dateKey){
    const card = getOpenCard();
    // If open, read DOM; if closed already, try STATE or leave existing state.dateTimes
    let arr = card ? readSelectedFromDOM(card) : (state?.dateTimes?.[dateKey] || []);
    commitToSTATE(dateKey, arr);
    commitToStateDateTimes(dateKey, arr);
    renderSummary(dateKey);
    // Optional hidden field mirror
    const hidden = document.querySelector('input[name="selected_times"], input[name="times_json"], #selectedTimesJSON');
    if (hidden){ try { hidden.value = JSON.stringify(state.dateTimes); } catch(_){ } }
    try { typeof updateNextButton3 === 'function' && updateNextButton3(); } catch(_){}
  }

  function restoreFromSaved(dateKey){
    const card = getOpenCard(); if (!card) return;
    card.dataset.dateKey = dateKey; // let removal observer know which day this card belongs to
    // derive saved picks
    let saved = [];
    if (window.STATE && STATE.get(dateKey)){
      STATE.get(dateKey).forEach((v,t)=>{
        const sel = (v === true) || (v && (v.selected || v.sel));
        if (sel) saved.push({ time: t, duration: (v && (v.duration||v.minutes)) || 30 });
      });
    } else if (state?.dateTimes?.[dateKey]){
      saved = state.dateTimes[dateKey].slice();
    }
    if (!saved.length) return;
    // apply to rows
    const rows = Array.from(card.querySelectorAll('.tp-row, [data-time]'));
    rows.forEach(r=>{
      const t = r.getAttribute('data-time') || r.dataset.time;
      const hit = saved.find(x => x.time === t);
      if (!hit) return;
      r.classList.add('is-selected');
      // set chip visuals
      const chips = r.querySelectorAll('.tp-chip');
      chips.forEach(c => c.classList.remove('is-active', 'active'));
      if (hit.duration >= 60){
        // prefer 60 chip if we can spot it
        const sixty = Array.from(chips).find(c => /60/.test(c.textContent || '') || c.getAttribute('data-duration') === '60' || c.getAttribute('data-chip') === '60');
        (sixty || chips[1] || chips[0])?.classList.add('is-active');
      } else {
        (chips[0] || chips[1])?.classList.add('is-active');
      }
    });
  }

  function closeOpenPicker(){
    const card = getOpenCard(); if (!card) return;
    const owner = card.closest('[data-date-id]'); if (!owner) return;
    const dateKey = owner.getAttribute('data-date-id');
    // Commit BEFORE closing so nothing gets lost
    commitAll(dateKey);
    const slot = card.closest('.time-picker-slot');
    if (slot){ slot.innerHTML = ''; slot.classList.remove('tp-open'); }
    if (window.state) state.inlineOpenDateStr = null;
  }

  // ---------- wiring ----------
  // A) When a picker opens anywhere, tag it with its date key and restore saved selections
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      for (const n of m.addedNodes){
        if (!(n instanceof Element)) continue;
        const tp = n.matches?.('.tp-card') ? n : (n.querySelector?.('.tp-card') || null);
        if (!tp) continue;
        // inline styling guard
        Object.assign(tp.style, { position:'static', inset:'auto', transform:'none', width:'100%', maxWidth:'100%' });
        const owner = tp.closest('[data-date-id]'); if (!owner) continue;
        const k = owner.getAttribute('data-date-id');
        tp.dataset.dateKey = k;
        // Restore saved picks onto rows so re-open shows same selections
        setTimeout(()=> restoreFromSaved(k), 0);
      }
    }
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  // B) On any click INSIDE the picker: keep state live (so summary updates while picking)
  document.addEventListener('click', (e)=>{
    const tp = e.target.closest('.tp-card'); if (!tp) return;
    const k = tp.dataset.dateKey || getOpenDateKey(); if (!k) return;
    setTimeout(()=> commitAll(k), 0); // commit after the row toggled/highlighted
  }, true);

  // C) Close + commit on Done buttons (many variants covered)
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest(
      '.tp-done, .tp-close, [data-tp-close], [data-close], .btn-done, .picker-done, .picker-close, button, a'
    );
    if (!btn) return;
    const txt = (btn.textContent || '').trim().toLowerCase();
    if (
      btn.matches('.tp-done, .tp-close, [data-tp-close], [data-close], .btn-done, .picker-done, .picker-close') ||
      txt === 'done' || txt === 'close'
    ){
      e.preventDefault();
      closeOpenPicker();
    }
  }, true);

  // D) Close + commit on outside click (but not when clicking inside the picker or the + button)
  document.addEventListener('click', (e)=>{
    const open = getOpenCard(); if (!open) return;
    if (e.target.closest('.tp-card')) return;
    if (e.target.closest('.add-times-btn')) return;
    closeOpenPicker();
  }, true);

  // E) When the "+" opens a picker, immediately restore any previously saved picks and show summary
  document.addEventListener('click', (e)=>{
    const plus = e.target.closest('.add-times-btn'); if (!plus) return;
    const item = plus.closest('[data-date-id]'); if (!item) return;
    const k = item.getAttribute('data-date-id');
    // Give your open function a tick, then restore+commit so summary is correct on open
    setTimeout(()=> { restoreFromSaved(k); commitAll(k); }, 0);
  }, true);
})();

/* === Close on DONE (commit + close, service-agnostic) === */
(function(){
  if (window.__snoutDoneCloseFix) return; window.__snoutDoneCloseFix = true;

  function pad(n){ return String(n).padStart(2,'0'); }
  function fmt(t){ const [H,M]=t.split(':').map(Number); const a=H>=12?'PM':'AM'; const h=((H+11)%12)+1; return `${h}:${pad(M)} ${a}`; }
  function keyFrom(x){ if(x instanceof Date)return x.toISOString().split('T')[0]; if(typeof x==='number')return new Date(x).toISOString().split('T')[0]; const s=String(x); if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s; const d=new Date(s); return isNaN(d)?s:d.toISOString().split('T')[0]; }
  function isHSBoundary(k){
    if(!window.state || state.selectedService!=='housesitting') return false;
    const sel=(state.selectedDates||[]).slice().sort((a,b)=>a-b);
    if(!sel.length) return false;
    const first=keyFrom(sel[0]); const last=keyFrom(sel[sel.length-1]);
    return k===first || k===last;
  }

  function readSelectedFromDOM(card){
    const rows=[...card.querySelectorAll('.tp-row,[data-time]')];
    const out=[];
    rows.forEach(r=>{
      const on=r.classList.contains('is-selected')||r.classList.contains('selected')||r.getAttribute('aria-selected')==='true';
      if(!on) return;
      const t=r.getAttribute('data-time')||r.dataset.time; if(!t) return;
      let dur=30; // default 30m
      const chip60=r.querySelector('.tp-chip.is-active,.tp-chip.active,[data-duration="60"].is-active,[data-chip="60"].active');
      if(chip60 && /60/.test(chip60.textContent||'60')) dur=60;
      out.push({time:t,duration:dur});
    });
    out.sort((a,b)=>a.time.localeCompare(b.time));
    return out;
  }

  function commitAndRender(dateKey, pickerCard){
    const arr = readSelectedFromDOM(pickerCard);

    if(!window.STATE) window.STATE=new Map();
    let map=STATE.get(dateKey); if(!map){ map=new Map(); STATE.set(dateKey,map); }
    // snapshot
    for(const k of [...map.keys()]) map.delete(k);
    arr.forEach(x=>map.set(x.time,{selected:true,duration:x.duration}));

    if(!window.state) window.state={};
    if(!state.dateTimes) state.dateTimes={};
    const finalArr=(isHSBoundary(dateKey)&&arr.length>2)?arr.slice(0,2):arr.slice();
    state.dateTimes[dateKey]=finalArr;

    const line=document.querySelector(`.selected-date-item[data-date-id="${CSS.escape(dateKey)}"] .selected-times-line, .selected-date-item[data-date-id="${CSS.escape(dateKey)}"] .times-display`);
    if(line){
      if(state.selectedService==='housesitting' && isHSBoundary(dateKey)){
        line.textContent = finalArr.length>=2 ? `${fmt(finalArr[0].time)}–${fmt(finalArr[1].time)}` :
                           finalArr.length===1 ? fmt(finalArr[0].time) : 'No times selected';
      } else {
        line.textContent = finalArr.length ? finalArr.map(x=>`${fmt(x.time)} ${x.duration||30}m`).join(', ') : 'No times selected';
      }
    }
    try{ typeof updateNextButton2==='function' && updateNextButton2(); }catch(_){}
  }

  function closePickerFor(card){
    const slot=card.closest('.time-picker-slot'); if(!slot) return;
    slot.innerHTML=''; slot.classList.remove('tp-open');
    if(window.state) state.inlineOpenDateStr=null;
  }

  // Catch *any* Done/Close button inside the inline picker and close it.
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.tp-card .tp-done, .tp-card [data-tp-close], .tp-card [data-close], .tp-card .picker-done, .tp-card .btn-done, .tp-card button, .tp-card a');
    if(!btn) return;

    // Only treat as Done if it looks like Done/Close
    const isMarked = btn.matches('.tp-done, [data-tp-close], [data-close], .picker-done, .btn-done');
    const label = (btn.textContent||'').trim().toLowerCase();
    if(!(isMarked || /^(done|close|save)$/.test(label))) return;

    const card = btn.closest('.tp-card'); if(!card) return;
    const owner = card.closest('[data-date-id]'); if(!owner) return;
    const dateKey = owner.getAttribute('data-date-id');

    e.preventDefault();
    // commit before closing so nothing is lost
    commitAndRender(dateKey, card);
    closePickerFor(card);
  }, true);
})();

/* === FORCE DONE TO COMMIT + CLOSE (capture-phase, works with any markup) === */
(function(){
  if (window.__snoutForceDoneClose) return; window.__snoutForceDoneClose = true;

  // --- helpers
  function pad(n){ return String(n).padStart(2,'0'); }
  function fmt(hhmm){ const [H,M]=hhmm.split(':').map(Number); const ampm = H>=12?'PM':'AM'; const h12=((H+11)%12)+1; return `${h12}:${pad(M)} ${ampm}`; }
  function keyFrom(x){ if(x instanceof Date)return x.toISOString().split('T')[0]; if(typeof x==='number')return new Date(x).toISOString().split('T')[0]; const s=String(x); if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s; const d=new Date(s); return isNaN(d)?s:d.toISOString().split('T')[0]; }
  function isHSBoundary(k){
    if(!window.state || state.selectedService!=='housesitting') return false;
    const sel=(state.selectedDates||[]).slice().sort((a,b)=>a-b);
    if(!sel.length) return false;
    const first=keyFrom(sel[0]), last=keyFrom(sel[sel.length-1]);
    return k===first || k===last;
  }
  function getOpenCard(){ return document.querySelector('.time-picker-slot .tp-card'); }
  function getDateKeyForCard(card){
    const owner = card.closest('[data-date-id]');
    return owner ? owner.getAttribute('data-date-id') : (card.dataset.dateKey || null);
  }
  function readSelectedFromDOM(card){
    const rows = card.querySelectorAll('.tp-row,[data-time]');
    const out = [];
    rows.forEach(r=>{
      const on = r.classList.contains('is-selected') || r.classList.contains('selected') || r.getAttribute('aria-selected')==='true';
      if(!on) return;
      const t = r.getAttribute('data-time') || r.dataset.time;
      if(!t) return;
      let dur = 30; // default
      const chip60 = r.querySelector('.tp-chip.is-active,.tp-chip.active,[data-duration="60"].is-active,[data-chip="60"].active');
      if (chip60 && /60/.test(chip60.textContent||'60')) dur = 60;
      out.push({ time:t, duration:dur });
    });
    out.sort((a,b)=>a.time.localeCompare(b.time));
    return out;
  }
  function commitToSTATE(dateKey, arr){
    if(!window.STATE) window.STATE = new Map();
    let map = STATE.get(dateKey);
    if(!map){ map = new Map(); STATE.set(dateKey, map); }
    for(const k of Array.from(map.keys())) map.delete(k);
    arr.forEach(x => map.set(x.time, { selected:true, duration:x.duration }));
  }
  function commitToDateTimes(dateKey, arr){
    if(!window.state) window.state = {};
    if(!state.dateTimes) state.dateTimes = {};
    const finalArr = (isHSBoundary(dateKey) && arr.length>2) ? arr.slice(0,2) : arr.slice();
    state.dateTimes[dateKey] = finalArr;
  }
  function renderSummary(dateKey){
    const owner = document.querySelector(`.selected-date-item[data-date-id="${CSS.escape(dateKey)}"]`);
    if(!owner) return;
    const line = owner.querySelector('.selected-times-line, .times-display, .selected-times, [data-selected-times]');
    if(!line) return;
    const arr = (state?.dateTimes?.[dateKey] || []).slice().sort((a,b)=>a.time.localeCompare(b.time));
    if (state?.selectedService==='housesitting' && isHSBoundary(dateKey)){
      if (arr.length>=2) line.textContent = `${fmt(arr[0].time)}–${fmt(arr[1].time)}`;
      else if (arr.length===1) line.textContent = fmt(arr[0].time);
      else line.textContent = 'No times selected';
    } else {
      line.textContent = arr.length ? arr.map(x => `${fmt(x.time)} ${x.duration||30}m`).join(', ') : 'No times selected';
    }
  }
  function commitAndClose(card){
    const dateKey = getDateKeyForCard(card);
    if(!dateKey) return;
    const arr = readSelectedFromDOM(card);
    commitToSTATE(dateKey, arr);
    commitToDateTimes(dateKey, arr);
    renderSummary(dateKey);
    // optional: mirror to hidden input if present
    const hidden = document.querySelector('input[name="selected_times"], input[name="times_json"], #selectedTimesJSON');
    if (hidden){ try { hidden.value = JSON.stringify(state.dateTimes); } catch(_){} }
    try { typeof updateNextButton2==='function' && updateNextButton2(); } catch(_){}
    // close
    const slot = card.closest('.time-picker-slot');
    if (slot){ slot.innerHTML=''; slot.classList.remove('tp-open'); }
    if (window.state) state.inlineOpenDateStr = null;
  }

  // Mark all "Done" buttons as type=button (don't submit forms)
  function markTypeButton(root){
    root.querySelectorAll('.tp-card .tp-done, .tp-card .picker-done, .tp-card .btn-done, .tp-card button, .tp-card input[type="submit"]').forEach(btn=>{
      if (btn.tagName === 'BUTTON' && !btn.getAttribute('type')) btn.setAttribute('type','button');
      if (btn.tagName === 'INPUT' && btn.type === 'submit') btn.setAttribute('type','button');
    });
  }
  const mo = new MutationObserver(muts=>{
    muts.forEach(m=>{
      m.addedNodes.forEach(n=>{
        if (!(n instanceof Element)) return;
        if (n.matches('.tp-card') || n.querySelector?.('.tp-card')) markTypeButton(n.matches('.tp-card')?n:n.querySelector('.tp-card'));
      });
    });
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  // CAPTURE pointer + click so nothing can swallow it before we do
  function isDoneLike(el){
    if (!el) return false;
    if (el.matches('.tp-done, [data-tp-close], [data-close], .picker-done, .btn-done')) return true;
    const txt = (el.textContent || '').trim().toLowerCase();
    return /^(done|close|save)$/.test(txt);
  }

  function handleDoneEvent(e){
    const btn = e.target.closest('.tp-card button, .tp-card a, .tp-card .tp-done, .tp-card [data-tp-close], .tp-card [data-close], .tp-card .picker-done, .tp-card .btn-done, .tp-card *');
    if(!btn) return;
    if(!isDoneLike(btn)) return;
    const card = btn.closest('.tp-card'); if(!card) return;
    e.preventDefault();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    e.stopPropagation();
    // commit + close
    commitAndClose(card);
  }

  // Use pointerup/click/keydown Enter/Escape to be extra robust
  ['pointerup','click'].forEach(evt=>{
    document.addEventListener(evt, handleDoneEvent, true); // capture
  });
  document.addEventListener('keydown', (e)=>{
    const card = getOpenCard(); if(!card) return;
    if (e.key === 'Enter' || e.key === 'Escape'){
      e.preventDefault();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      e.stopPropagation();
      commitAndClose(card);
    }
  }, true);
})();

/* === RESET CALENDAR & TIMES WHEN SERVICE CHANGES (final) === */
(function(){
  if (window.__snoutServiceReset) return; window.__snoutServiceReset = true;

  // --- normalize service labels to a stable key
  function normService(v){
    if (!v) return null;
    const s = String(v).trim().toLowerCase().replace(/\s+/g,'');
    if (/^house?sitting|overnight$/.test(s)) return 'housesitting';
    if (/^drop-?ins?$/.test(s)) return 'dropins';
    if (/^walks?$/.test(s)) return 'walks';
    if (/^24(h|hr|hour)$|^24hour$/.test(s)) return '24hour';
    if (/^pettaxi|taxi$/.test(s)) return 'pettaxi';
    return s;
  }

  // --- hard reset all user selections & UI
  function resetBookingSelections(){
    // state stores
    if (!window.state) window.state = {};
    state.selectedDates = [];
    state.dateTimes = {};
    state.inlineOpenDateStr = null;

    // inline picker store (Map) used by the inline time picker
    if (window.STATE && typeof STATE.clear === 'function') STATE.clear();

    // close any open picker UIs
    document.querySelectorAll('.tp-card').forEach(n=>n.remove());
    document.querySelectorAll('.time-picker-slot').forEach(slot=>{
      slot.innerHTML = '';
      slot.classList.remove('tp-open');
    });

    // clear calendar day selections (cover common class names/attrs)
    document.querySelectorAll(
      '.calendar-day.selected, .calendar-day.is-selected, .day.selected, .day.is-selected, ' +
      '[data-calendar-day].selected, [data-calendar-day].is-selected, [data-calendar-day][aria-selected="true"]'
    ).forEach(el=>{
      el.classList.remove('selected','is-selected','active');
      if (el.getAttribute && el.hasAttribute('aria-selected')) el.setAttribute('aria-selected','false');
    });

    // clear the selected-dates list UI
    const list = document.getElementById('selectedDatesList') ||
                 document.querySelector('#selectedDatesContainer #selectedDatesList, .selected-dates-list');
    if (list) list.innerHTML = '';

    // reset any per-date summary text
    document.querySelectorAll('.selected-date-item .selected-times-line, .selected-date-item .times-display, [data-selected-times]')
      .forEach(el=>{ el.textContent = 'No times selected'; });

    // clear hidden field mirrors if present
    const hidden = document.querySelector('input[name="selected_times"], input[name="times_json"], #selectedTimesJSON');
    if (hidden) hidden.value = '';

    // let the rest of the app redraw safely
    try { typeof updateSelectedDatesDisplay === 'function' && updateSelectedDatesDisplay(); } catch(_){}
    try { typeof updateNextButton2       === 'function' && updateNextButton2();       } catch(_){}
    try { typeof renderCalendar          === 'function' && renderCalendar();          } catch(_){}

    // announce reset for any custom listeners
    try { document.dispatchEvent(new CustomEvent('snout:reset')); } catch(_){}
  }

  // --- track last service to only reset when it actually changes
  let lastService = normService(window.state?.selectedService) || null;

  function handleServiceChange(raw){
    const svc = normService(raw);
    if (!svc) return;
    // store the selection in your state for consistency
    if (!window.state) window.state = {};
    const prev = normService(state.selectedService);
    state.selectedService = svc;

    // only reset if the key actually changed
    if (svc !== prev && svc !== lastService){
      lastService = svc;
      resetBookingSelections();
    }
  }

  // --- wire up service controls (radios, selects, cards/tiles)
  document.addEventListener('change', (e)=>{
    const t = e.target;
    if (t.matches('input[name="service"]')) handleServiceChange(t.value);
    if (t.matches('select[name="service"]')) {
      handleServiceChange(t.value || t.options[t.selectedIndex]?.text);
    }
  }, true);

  document.addEventListener('click', (e)=>{
    const card = e.target.closest('[data-service],[data-service-option],.service-card, label[for]');
    if (!card) return;

    // get value from dataset or label/inner text
    let val = card.dataset.service || card.dataset.serviceOption || card.getAttribute('data-service') || card.textContent;

    // if it's a label tied to a radio, prefer the radio's value
    const forId = card.getAttribute && card.getAttribute('for');
    if (forId){
      const radio = document.getElementById(forId);
      if (radio && radio.name === 'service') val = radio.value;
    }
    handleServiceChange(val);
  }, true);

  // --- also reset if a dedicated "Back to services" control explicitly changes service
  // (This is a safety: if your step navigation rewires the DOM, selecting a different service still triggers above.)
})();

/* === RESET CALENDAR + TIMES ON SERVICE CHANGE (works with radios, selects, cards) === */
(function(){
  if (window.__snoutServiceResetFinal) return; window.__snoutServiceResetFinal = true;

  // Map whatever label you use to a stable key
  function normService(v){
    if (!v) return null;
    const s = String(v).trim().toLowerCase().replace(/\s+/g,'');
    if (/^house?sitting|overnight$/.test(s)) return 'housesitting';
    if (/^drop-?ins?$/.test(s)) return 'dropins';
    if (/^walks?$/.test(s)) return 'walks';
    if (/^24(h|hr|hour)$|^24hour$/.test(s)) return '24hour';
    if (/^pettaxi|taxi$/.test(s)) return 'pettaxi';
    return s;
  }

  const NEXT_BTN_SEL = '#nextBtn2, #nextBtnStep2, [data-next-step="2"], #nextToContact, .js-next-2, [data-action="next-contact"]';

  function disableNext(){
    document.querySelectorAll(NEXT_BTN_SEL).forEach(btn=>{
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.classList.add('is-disabled');
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '.6';
    });
  }

  function resetBookingSelections(){
    // 1) State stores
    if (!window.state) window.state = {};
    state.selectedDates = [];
    state.dateTimes = {};
    state.inlineOpenDateStr = null;

    // 2) Inline picker store (Map) if used by your picker
    try { if (window.STATE && typeof STATE.clear === 'function') STATE.clear(); } catch(_) {}

    // 3) Close any open inline time pickers
    document.querySelectorAll('.tp-card').forEach(n=>n.remove());
    document.querySelectorAll('.time-picker-slot').forEach(slot=>{
      slot.innerHTML = '';
      slot.classList.remove('tp-open');
    });

    // 4) Unselect all days in calendar (cover common class/attr patterns)
    document.querySelectorAll(
      '.calendar-day.selected, .calendar-day.is-selected, .day.selected, .day.is-selected, ' +
      '[data-calendar-day].selected, [data-calendar-day].is-selected, [data-calendar-day][aria-selected="true"]'
    ).forEach(el=>{
      el.classList.remove('selected','is-selected','active');
      if (el.hasAttribute('aria-selected')) el.setAttribute('aria-selected','false');
    });

    // 5) Clear the Selected Dates list UI
    const list = document.getElementById('selectedDatesList') ||
                 document.querySelector('#selectedDatesContainer #selectedDatesList, .selected-dates-list');
    if (list) list.innerHTML = '';

    // 6) Reset any per-date summary lines
    document.querySelectorAll('.selected-date-item .selected-times-line, .selected-date-item .times-display, [data-selected-times]')
      .forEach(el=>{ el.textContent = 'No times selected'; });

    // 7) Clear mirrors (hidden inputs / localStorage) if you use them
    const hidden = document.querySelector('input[name="selected_times"], input[name="times_json"], #selectedTimesJSON');
    if (hidden) hidden.value = '';
    try {
      ['selected_times','times_json','selectedDates','dateTimes'].forEach(k=>localStorage.removeItem(k));
    } catch(_){}

    // 8) Disable Next until new picks are made
    disableNext();

    // 9) Let your existing UI rebuild if those hooks exist
    try { typeof updateSelectedDatesDisplay === 'function' && updateSelectedDatesDisplay(); } catch(_){}
    try { typeof updateNextButton2       === 'function' && updateNextButton2();       } catch(_){}
    try { typeof renderCalendar          === 'function' && renderCalendar();          } catch(_){}
    try { typeof drawCalendar            === 'function' && drawCalendar();            } catch(_){}
    try { document.dispatchEvent(new CustomEvent('snout:reset')); } catch(_){}
  }

  // Track last service so we only reset when it actually changes
  let lastService = normService(window.state?.selectedService) || null;

  function handleServiceChange(raw){
    const svc = normService(raw);
    if (!svc) return;
    if (!window.state) window.state = {};
    const prev = normService(state.selectedService);
    state.selectedService = svc;

    if (svc !== prev || svc !== lastService){
      lastService = svc;
      resetBookingSelections();
    }
  }

  // Bind radios and <select>
  document.addEventListener('change', (e)=>{
    const t = e.target;
    if (t.matches('input[name="service"]')) handleServiceChange(t.value);
    if (t.matches('select[name="service"]')) handleServiceChange(t.value || t.options[t.selectedIndex]?.text);
  }, true);

  // Bind clickable service tiles/cards/labels
  document.addEventListener('click', (e)=>{
    const card = e.target.closest('[data-service],[data-service-option],.service-card, label[for]');
    if (!card) return;
    let val = card.dataset.service || card.dataset.serviceOption || card.getAttribute('data-service') || card.textContent;
    const forId = card.getAttribute && card.getAttribute('for');
    if (forId){
      const radio = document.getElementById(forId);
      if (radio && radio.name === 'service') val = radio.value;
    }
    handleServiceChange(val);
  }, true);
})();

/* ===== SNOUT MOBILE HELPERS (vh + Webflow-safe) ===== */
(function(){
  if (window.__snoutMobileHelpers) return; window.__snoutMobileHelpers = true;

  // iOS/Android 100vh fix -> sets --snout-vh
  function setVH(){
    const h = window.innerHeight * 0.01;
    document.querySelectorAll('#snout-booking').forEach(el=>{
      el.style.setProperty('--snout-vh', `${h}px`);
    });
  }
  setVH();
  window.addEventListener('resize', setVH, {passive:true});
  window.addEventListener('orientationchange', setVH, {passive:true});
  document.addEventListener('visibilitychange', setVH);

  // Webflow interaction redraws can detach listeners. Nudge our existing logic to re-check.
  const poke = ()=> {
    try { typeof updateSelectedDatesDisplay === 'function' && updateSelectedDatesDisplay(); } catch(_){}
    try { typeof updateNextButton3 === 'function' && updateNextButton3(); } catch(_){}
  };
  ['snout:reset','DOMContentLoaded','readystatechange'].forEach(evt=>{
    document.addEventListener(evt, poke, true);
  });

  // Guard: if Webflow re-writes DOM, ensure any stray picker stays inline
  const mo = new MutationObserver((muts)=>{
    muts.forEach(m=>{
      m.addedNodes.forEach(n=>{
        if (!(n instanceof Element)) return;
        const card = n.matches?.('.tp-card') ? n : n.querySelector?.('.tp-card');
        if (!card) return;
        // force inline sizing
        card.style.position = 'static';
        card.style.inset = 'auto';
        card.style.transform = 'none';
        card.style.width = '100%';
        card.style.maxWidth = '100%';
      });
    });
  });
  mo.observe(document.documentElement, {childList:true, subtree:true});
})();

/* House Sitting: hide duration chips + realign rows */
(function(){
  if (window.__snoutHideChipsHS) return; window.__snoutHideChipsHS = true;

  const root = document.querySelector('#snout-booking') || document.body;

  function isHouseSitting(service) {
    if (!service) return false;
    const s = String(service).toLowerCase();
    return s === 'housesitting' || /house\s*sitting|overnight/.test(s);
  }

  function refreshHSClass(){
    const svc = (window.state && state.selectedService) ? state.selectedService : null;
    root.classList.toggle('is-housesitting', isHouseSitting(svc));
  }

  // Initial pass
  refreshHSClass();

  // Watch service changes (radios/selects/cards)
  document.addEventListener('change', (e)=>{
    if (e.target.matches('input[name="service"], select[name="service"]')) {
      setTimeout(refreshHSClass, 0);
    }
  }, true);

  document.addEventListener('click', (e)=>{
    if (e.target.closest('[data-service],[data-service-option],.service-card, label[for]')) {
      setTimeout(refreshHSClass, 0);
    }
  }, true);

  // If a picker renders while HS is active, remove its chips and realign rows
  const mo = new MutationObserver((muts)=>{
    if (!root.classList.contains('is-housesitting')) return;
    for (const m of muts){
      for (const n of m.addedNodes){
        if (!(n instanceof Element)) continue;
        const card = n.matches?.('.tp-card') ? n : (n.querySelector?.('.tp-card') || null);
        if (!card) continue;
        // remove chip UI
        card.querySelectorAll('.tp-toggle, .tp-chip, .tp-min-label').forEach(el => el.remove());
        // align rows
        card.querySelectorAll('.tp-row').forEach(r => { r.style.justifyContent = 'flex-start'; });
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();

/* === House Sitting: label first/last day pickers (Starting time / Ending time) === */
(function(){
  if (window.__snoutHsBoundaryLabels) return; window.__snoutHsBoundaryLabels = true;

  function keyFrom(x){
    if (x instanceof Date) return x.toISOString().split('T')[0];
    if (typeof x === 'number') return new Date(x).toISOString().split('T')[0];
    const s = String(x); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s); return isNaN(d) ? s : d.toISOString().split('T')[0];
  }
  function isHS(){
    return !!(window.state && state.selectedService === 'housesitting');
  }
  function getBoundary(dateKey){
    if (!isHS()) return null;
    const sel = (state?.selectedDates || []).slice().sort((a,b)=>a-b);
    if (!sel.length) return null;
    const first = keyFrom(sel[0]);
    const last  = keyFrom(sel[sel.length-1]);
    if (dateKey === first && dateKey === last) return 'first'; // single-day edge: treat as start
    if (dateKey === first) return 'first';
    if (dateKey === last)  return 'last';
    return null;
  }
  function labelFor(dateKey){
    const b = getBoundary(dateKey);
    if (b === 'first') return 'Starting time';
    if (b === 'last')  return 'Ending time';
    return 'Select Times';
  }
  function applyLabelToCard(card){
    const owner = card.closest('[data-date-id]');
    if (!owner) return;
    const dateKey = owner.getAttribute('data-date-id');
    const title = card.querySelector('.tp-title');
    const text  = labelFor(dateKey);
    if (title) title.textContent = text;
    card.setAttribute('aria-label', text);
  }

  // When a picker appears, set its label immediately
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      for (const n of m.addedNodes){
        if (!(n instanceof Element)) continue;
        const card = n.matches?.('.tp-card') ? n : (n.querySelector?.('.tp-card') || null);
        if (!card) continue;
        // force inline size stays intact; then label
        card.style.position = 'static'; card.style.inset = 'auto';
        card.style.transform = 'none'; card.style.width = '100%'; card.style.maxWidth = '100%';
        applyLabelToCard(card);
      }
    }
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  // Re-label any open picker if service/dates change while it's open
  function relabelOpen(){
    const open = document.querySelector('.time-picker-slot .tp-card');
    if (open) applyLabelToCard(open);
  }
  ['click','change'].forEach(evt=>{
    document.addEventListener(evt, (e)=>{
      if (
        e.target.closest('.calendar-day, [data-calendar-day], .service-card, [name="service"], select[name="service"]') ||
        e.target.closest('.add-times-btn')
      ){
        setTimeout(relabelOpen, 0);
      }
    }, true);
  });
})();

;(()=>{
  window.SB = window.SB || { state: {} };
  const state = window.SB.state;
  if(!Array.isArray(state.selectedDates)) state.selectedDates = [];
  if(!state.dateTimes) state.dateTimes = {};
  if(typeof state.selectedService === 'undefined') state.selectedService = null;
  if(typeof state.applyAllSync === 'undefined') state.applyAllSync = false;
  if(typeof state.applyAllTouched === 'undefined') state.applyAllTouched = false;

  function norm(d){ try{ return (d instanceof Date? d:new Date(d)).toISOString().split('T')[0]; }catch(_){ return d; } }
  function firstKey(){ return state.selectedDates.length ? norm(state.selectedDates[0]) : null; }
  function canShow(){ return state.selectedService !== 'housesitting' && state.selectedDates.length >= 2; }

  function cloneFromFirst(){
    const fk = firstKey(); if(!fk) return;
    const src = (state.dateTimes[fk] || []).map(e=>({time:e.time, duration:e.duration}));
    for(let i=1;i<state.selectedDates.length;i++){
      const k = norm(state.selectedDates[i]);
      state.dateTimes[k] = src.map(e=>({time:e.time, duration:e.duration}));
    }
    if(typeof window.updateSelectedDatesDisplay === 'function') window.updateSelectedDatesDisplay();
  }

  window.updateApplyAllVisibility = function(){
    const wrap = document.getElementById('applyAllWrap');
    const cb   = document.getElementById('applyAllToggle');
    if(!wrap || !cb) return;

    const show = canShow();
    wrap.style.display = show ? '' : 'none';

    if(!show){
      state.applyAllSync = false;
      cb.checked = false;
      return;
    }

    const fk = firstKey();
    const hasFirst = !!(fk && state.dateTimes[fk] && state.dateTimes[fk].length);

    // Auto-enable & clone in Case 1 and Case 2, unless user already touched the toggle
    if(hasFirst && !state.applyAllTouched){
      state.applyAllSync = true;
      cb.checked = true;
      cloneFromFirst();
    }
  };

  const _origUpdate = window.updateSummaryAndState;
  window.updateSummaryAndState = function(dateKey){
    try{ _origUpdate && _origUpdate.apply(this, arguments); }catch(_){}
    try{
      const fk = firstKey();
      if(!fk) return;
      if(dateKey === fk){
        // When first-date times change, apply Case 2 behavior
        updateApplyAllVisibility();
        if(state.applyAllSync) cloneFromFirst();
      }
    }catch(_){}
  };

  const _origSel = window.onDateSelectionChanged;
  window.onDateSelectionChanged = function(){
    try{ _origSel && _origSel.apply(this, arguments); }catch(_){}
    updateApplyAllVisibility();
    if(state.applyAllSync) cloneFromFirst();
  };

  document.addEventListener('DOMContentLoaded', updateApplyAllVisibility);
})();



;(() => {
  if (window.__snoutEditTimesPersistPatch) return;
  window.__snoutEditTimesPersistPatch = true;

  // Small helpers
  function keyFrom(x){
    if (x instanceof Date) return x.toISOString().split('T')[0];
    if (typeof x === 'number') return new Date(x).toISOString().split('T')[0];
    const s = String(x);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s); return isNaN(d) ? s : d.toISOString().split('T')[0];
  }
  function firstKey(){
    try {
      const sel = (window.state?.selectedDates || []);
      return sel.length ? keyFrom(sel[0]) : null;
    } catch(_) { return null; }
  }
  function getState(){ if(!window.state) window.state = {}; return window.state; }

  // 1) HYDRATE picker STATE from state.dateTimes when opening Edit Times
  //    Prevents "times disappearing" on open -> sync.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-times-btn');
    if (!btn) return;

    const card   = btn.closest('[data-date-id]');
    if (!card) return;
    const dateId = card.getAttribute('data-date-id');

    const s = getState();
    if (!s.dateTimes) s.dateTimes = {};
    const existing = (s.dateTimes[dateId] || []).slice(); // [{time, duration}]

    // If we have saved times for this date, preload them into the inline picker's STATE map
    // so the picker opens with selections ON (and sync won't wipe).
    if (existing.length && window.STATE && typeof window.STATE.set === 'function') {
      const map = {};
      existing.forEach(({time, duration}) => { map[time] = duration || 30; });
      window.STATE.set(dateId, map);
    }

    // After the picker renders, mark rows as selected to mirror STATE/dateTimes
    setTimeout(() => {
      const picker = card.querySelector('.time-picker-slot .tp-card');
      if (!picker) return;

      // Use whatever is available: STATE map or dateTimes
      const chosen = (window.STATE && window.STATE.get(dateId)) || {};
      const fallbackArr = existing;
      const rows = picker.querySelectorAll('.tp-row,[data-time]');

      rows.forEach(r => {
        const t = r.getAttribute('data-time') || r.dataset.time;
        if (!t) return;
        const has = (t in chosen) || !!fallbackArr.find(x => x.time === t);
        if (has) {
          r.classList.add('is-selected');
          // make 60 chip active when needed
          const dur = (t in chosen) ? (chosen[t] || 30) : (fallbackArr.find(x => x.time === t)?.duration || 30);
          const chip30 = r.querySelector('.tp-chip[data-chip="30"], .seg-30');
          const chip60 = r.querySelector('.tp-chip[data-chip="60"], .seg-60');
          if (chip30 && chip60) {
            if (dur === 60) { chip60.classList.add('is-active'); chip30.classList.remove('is-active'); }
            else { chip30.classList.add('is-active'); chip60.classList.remove('is-active'); }
          }
          r.setAttribute('aria-selected', 'true');
        }
      });

      // Force a summary + state sync now that rows reflect saved times
      if (typeof window.updateSelectedDatesDisplay === 'function') window.updateSelectedDatesDisplay();
      if (typeof window.updateNextButton2 === 'function') window.updateNextButton2();
      if (typeof window.refreshApplyAllUI === 'function') window.refreshApplyAllUI();
    }, 0);
  }, true);

  // 2) If Apply to all is ON and the user edits a NON-first date,
  //    turn Apply to all OFF automatically to protect the custom edit.
  document.addEventListener('click', (e) => {
    const row = e.target.closest('.tp-row, .time-row, .tp-chip, .duration-switch');
    if (!row) return;

    const card = row.closest('[data-date-id]');
    if (!card) return;
    const dateId = card.getAttribute('data-date-id');
    const fk = firstKey();

    const s = getState();
    if (s.selectedService === 'housesitting') return; // not in scope
    if (!s.applyAllSync) return;
    if (!fk || dateId === fk) return; // editing first date is allowed to drive cloning

    // User is editing another day while apply-all is on -> disable sync and reflect in UI
    s.applyAllSync = false;
    s.applyAllTouched = true;
    const cb = document.getElementById('applyAllToggle');
    if (cb) {
      cb.checked = false;
      cb.setAttribute('aria-checked','false');
    }
    if (typeof window.refreshApplyAllUI === 'function') window.refreshApplyAllUI();
  }, true);

})();


{
  "project": "Snout Booking Form",
  "build": "unified-clean-v2",
  "timestamp": "2025-10-02T16:20:19.960968",
  "tweaks": [
    {
      "key": "house_sitting_note_copy",
      "status": "applied",
      "details": "Exact copy for pink box note."
    },
    {
      "key": "hide_bottom_hint_hs",
      "status": "applied",
      "details": "Hide 'Tap times...' only for House Sitting."
    },
    {
      "key": "mobile_webflow_opt",
      "status": "applied",
      "details": "Responsive layer for Webflow + mobile."
    },
    {
      "key": "circle_buttons_geometry",
      "status": "applied",
      "details": "Perfect circle buttons and centered glyphs."
    },
    {
      "key": "apply_all_dual_behavior",
      "status": "applied",
      "details": "Auto-enable + clone Case 1 and Case 2; respects user toggle."
    },
    {
      "key": "inline_picker_only",
      "status": "applied",
      "details": "Inline picker mounted inside selected date card; no modal path."
    },
    {
      "key": "unified_script",
      "status": "applied",
      "details": "Single consolidated script with last-override semantics."
    },
    {
      "key": "hs_note_emphasis",
      "status": "applied",
      "details": "Emphasized key terms in house-sitting pink box."
    },
    {
      "key": "hide_tp_foot_housesitting",
      "status": "applied",
      "details": "Hide 'Tap times to add. 30m by default.' for house sitting only."
    },
    {
      "key": "hide_tp_foot_hs_css",
      "status": "applied",
      "details": "CSS-only hide of .tp-foot when .is-housesitting is active."
    }
  ]
}


;(()=>{
  window.SB = window.SB || { state: {} };
  // Idempotent tweak registry to avoid double-applying the same patch
  window.SB.tweaks = window.SB.tweaks || new Set();
  window.applyTweak = function(key, fn){
    try{
      if(window.SB.tweaks.has(key)) return; // already applied
      typeof fn === 'function' && fn();
      window.SB.tweaks.add(key);
    }catch(e){ console.error('applyTweak failed for', key, e); }
  };
  // Utility to read the embedded manifest
  window.getBuildManifest = function(){
    try{
      const el = document.getElementById('snout-build-manifest');
      if(!el) return null;
      return JSON.parse(el.textContent);
    }catch(_){ return null; }
  };
})();



;(()=>{
  // Ensure tweak registry exists
  window.SB = window.SB || { state: {} };
  if(!window.SB.tweaks) window.SB.tweaks = new Set();
  if(typeof window.applyTweak !== 'function'){
    window.applyTweak = function(key, fn){
      try{ if(window.SB.tweaks.has(key)) return; fn && fn(); window.SB.tweaks.add(key); }catch(e){}
    };
  }

  window.applyTweak('hide_tp_foot_housesitting', function(){
    function isHS(){ try{ return window.SB && window.SB.state && window.SB.state.selectedService === 'housesitting'; }catch(_){ return false; } }
    function setFootVisibility(root){
      try{
        const foot = root.querySelector && root.querySelector('.tp-foot');
        if(!foot) return;
        foot.style.display = isHS() ? 'none' : '';
      }catch(_){}
    }

    // Run on DOM ready for any existing pickers
    document.addEventListener('DOMContentLoaded', ()=>{
      document.querySelectorAll('.tp-card').forEach(card=> setFootVisibility(card));
    });

    // Watch for any new time pickers opening
    const mo = new MutationObserver((muts)=>{
      for(const m of muts){
        for(const n of m.addedNodes){
          if(!(n instanceof Element)) continue;
          const card = n.matches?.('.tp-card') ? n : n.querySelector?.('.tp-card');
          if(card) setFootVisibility(card);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Also re-check whenever first-date times or service change propagate via common hooks
    const _upd = window.updateSummaryAndState;
    window.updateSummaryAndState = function(){
      try{ _upd && _upd.apply(this, arguments); }catch(_){}
      document.querySelectorAll('.tp-card').forEach(card=> setFootVisibility(card));
    };

    const _sel = window.onDateSelectionChanged;
    window.onDateSelectionChanged = function(){
      try{ _sel && _sel.apply(this, arguments); }catch(_){}
      document.querySelectorAll('.tp-card').forEach(card=> setFootVisibility(card));
    };
  });
})();



;(()=>{
  if (window.__snoutHardeningPatch) return;
  window.__snoutHardeningPatch = true;

  const SB = window.SB = window.SB || { state: {} };
  const state = SB.state || (SB.state = {});

  function normalizeDate(d){
    try{
      const date = new Date(d);
      date.setHours(0,0,0,0);
      return date.toISOString().slice(0,10);
    } catch(_){ return ''; }
  }

  function dateFromStr(s){
    const [y,m,d] = s.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    dt.setHours(0,0,0,0);
    return dt;
  }

  function daysBetween(a,b){
    return Math.round((b - a) / (1000*60*60*24));
  }

  function consecutiveFill(minStr, maxStr){
    const out = [];
    const start = dateFromStr(minStr);
    const end   = dateFromStr(maxStr);
    const n = Math.max(0, daysBetween(start,end));
    for (let i=0;i<=n;i++){
      const d = new Date(start);
      d.setDate(start.getDate()+i);
      d.setHours(0,0,0,0);
      out.push(new Date(d));
    }
    return out;
  }

  function isHouseSitting(){
    try { return state.selectedService === 'housesitting'; } catch(_){ return false; }
  }

  function getSelectedDates(){
    try { return Array.isArray(state.selectedDates) ? state.selectedDates : []; } catch(_){ return []; }
  }

  function fixNonConsecutiveHouseSitting(){
    if (!isHouseSitting()) return;
    const dates = getSelectedDates();
    if (dates.length < 2) return;

    // Sort and compute range
    const sorted = [...dates].map(d=>new Date(d).setHours(0,0,0,0)).sort((a,b)=>a-b).map(ms=>{ const d=new Date(ms); d.setHours(0,0,0,0); return d; });
    const minStr = normalizeDate(sorted[0]);
    const maxStr = normalizeDate(sorted[sorted.length-1]);

    // If already contiguous, nothing to do
    let contiguous = true;
    for (let i=1;i<sorted.length;i++){
      if (daysBetween(sorted[i-1],sorted[i]) !== 1){ contiguous = false; break; }
    }
    if (contiguous) return;

    // Expand to full contiguous range [min..max]
    const filled = consecutiveFill(minStr, maxStr);
    state.selectedDates = filled;

    // Keep any existing per-date times for endpoints, blank for middles
    state.dateTimes = state.dateTimes || {};
    const firstTimes = state.dateTimes[minStr] ? [...state.dateTimes[minStr]] : [];
    const lastTimes  = state.dateTimes[maxStr] ? [...state.dateTimes[maxStr]] : [];
    const newMap = {};
    filled.forEach((d,i)=>{
      const key = normalizeDate(d);
      if (i===0) newMap[key] = firstTimes;
      else if (i===filled.length-1) newMap[key] = lastTimes;
      else newMap[key] = []; // middle days have no time UI in house sitting
    });
    state.dateTimes = newMap;

    // Sync UI if helpers exist
    try { typeof generateCalendar === 'function' && generateCalendar(); } catch(_){}
    try { typeof updateSelectedDatesDisplay === 'function' && updateSelectedDatesDisplay(); } catch(_){}
    try { typeof updateCalendarSubtitle === 'function' && updateCalendarSubtitle(); } catch(_){}
    try { typeof updateNextButton3 === 'function' && updateNextButton3(); } catch(_){}

    // Visual cue (non-blocking)
    try {
      const note = document.querySelector('.house-sitting-note');
      if (note) { note.classList.add('pulse-once'); setTimeout(()=>note.classList.remove('pulse-once'), 800); }
    } catch(_){}
  }

  // Hide/disable apply-all in house sitting, always
  function enforceApplyAllRule(){
    try {
      const cont = document.getElementById('applyAllContainer');
      if (!cont) return;
      if (isHouseSitting()){
        cont.style.display = 'none';
        cont.setAttribute('aria-hidden','true');
        const toggle = document.getElementById('applyAllToggle');
        if (toggle && toggle.checked) toggle.checked = false;
      }
    } catch(_){}
  }

  // Single entry point
  function enforceAll(){
    try {
      fixNonConsecutiveHouseSitting();
      enforceApplyAllRule();
    } catch(e){
      console.error('Hardening enforcement error', e);
    }
  }

  // Idempotent listeners
  if (!window.__snoutHardeningBound){
    window.__snoutHardeningBound = true;
    // Enforce at critical lifecycle points
    window.addEventListener('load', enforceAll, {once:false, passive:true});
    document.addEventListener('visibilitychange', enforceAll, {passive:true});
    window.addEventListener('pageshow', enforceAll, {passive:true});
    // Hook after likely internal redraws
    ['snout:reset','snout:update','click','change'].forEach(evt=>{
      document.addEventListener(evt, (e)=>{
        // only pay cost when interacting with calendar/service areas
        if (e.type==='click' || e.type==='change'){
          const t = e.target;
          if (!t) return;
          if (t.closest('.calendar-grid') || t.closest('.service-grid') || t.id==='applyAllToggle' || t.closest('#selectedDatesContainer')){
            enforceAll();
          }
        } else {
          enforceAll();
        }
      }, true);
    });
  }

  // Run once now
  enforceAll();
})();



;(()=>{
  if (window.__snoutToastPatch) return;
  window.__snoutToastPatch = true;

  function ensureToast(){
    let el = document.getElementById('snout-toast');
    if (!el){
      el = document.createElement('div');
      el.id = 'snout-toast';
      el.setAttribute('role','status');
      el.setAttribute('aria-live','polite');
      el.innerHTML = '<i class="fa-solid fa-circle-info"></i><span class="msg"></span>';
      document.body.appendChild(el);
    }
    return el;
  }

  let hideTimer = null;
  function showToast(message, ms=2500){
    const el = ensureToast();
    el.querySelector('.msg').textContent = message;
    el.classList.add('show');
    if (hideTimer) { clearTimeout(hideTimer); }
    hideTimer = setTimeout(()=>{
      el.classList.remove('show');
    }, ms);
  }

  // Expose globally for reuse
  window.snoutError = showToast;

  // Integrate with hardening guard if present
  document.addEventListener('click', (e)=>{
    const t = e.target;
    if (!t) return;
    // Prevent middle-day edits in house sitting
    if (t.closest && t.closest('.add-times-btn.disabled')){
      showToast('For house sitting only the first and last day have times.');
    }
    // If someone tries to toggle Apply All while blocked
    if (t.id === 'applyAllToggle'){
      const SB = window.SB || {state:{}};
      if (SB.state && SB.state.selectedService === 'housesitting'){
        showToast('Apply to all is disabled for house sitting.');
      }
    }
  }, true);

  // Hook into our enforcement to display reminders
  const oldEnforce = window.__snoutEnforceAll;
  window.__snoutEnforceAll = function(reason){
    try{ if (typeof oldEnforce === 'function') oldEnforce(reason); }catch(_){}
    try{
      const SB = window.SB || {state:{}};
      const s = SB.state || {};
      if (s.selectedService === 'housesitting' && Array.isArray(s.selectedDates) && s.selectedDates.length >= 2){
        // Quick check: if non-consecutive request was just corrected, message once
        if (window.__snoutLastToastKey !== 'hs-consecutive'){
          // Rough heuristic: consecutive gap bigger than 1 day means we likely corrected
          const sorted = [...s.selectedDates].map(d=>new Date(d).setHours(0,0,0,0)).sort((a,b)=>a-b);
          for (let i=1;i<sorted.length;i++){
            const prev = sorted[i-1], curr = sorted[i];
            if (Math.round((curr - prev) / (1000*60*60*24)) !== 1){
              showToast('House sitting must be consecutive. We aligned your dates.');
              window.__snoutLastToastKey = 'hs-consecutive';
              break;
            }
          }
        }
      }
    }catch(_){}
  };
})();



(function(){
  /* viewport unit fallback */
  function setVh(){ var vh = window.innerHeight * 0.01; document.documentElement.style.setProperty('--snout-vh', vh + 'px'); }
  setVh(); window.addEventListener('resize', setVh); window.addEventListener('orientationchange', function(){ setTimeout(setVh, 250); });

  /* smooth pet dropdown: keep fixed height for scroll wheel */
  var ORIG_TOGGLE = window.togglePetPanel || null;
  window.togglePetPanel = function(force){
    if (typeof ORIG_TOGGLE === 'function') ORIG_TOGGLE(force);
    try{
      var panel = document.getElementById('petPanel');
      var trigger = document.querySelector('.pet-dropdown-trigger');
      if (!panel || !trigger) return;
      // Keep fixed height for scroll wheel functionality
      if (panel.classList.contains('active')){
        panel.style.height = '150px';
        panel.style.overflow = 'hidden';
      }
    }catch(_){}
  };

  function isMobile(){ return (window.matchMedia && window.matchMedia('(max-width: 900px)').matches); }

  /* lock/unlock scroll for overlay */
  var _sy=0;
  window.__snout_lockScroll=function(){ _sy = window.scrollY||0; document.body.style.position='fixed'; document.body.style.top = -_sy+'px'; document.body.style.left='0'; document.body.style.right='0'; document.body.style.width='100%'; document.body.style.overflow='hidden'; };
  window.__snout_unlockScroll=function(){ document.body.style.position=''; document.body.style.top=''; document.body.style.left=''; document.body.style.right=''; document.body.style.width=''; document.body.style.overflow=''; window.scrollTo(0,_sy||0); };

  /* Always render the inline picker inside overlay on mobile so visuals/behavior match */
  var ORIG_INLINE = window.openInlineTimePicker || null;
  window.openInlineTimePicker = function(dateId, mount){
    if (isMobile()){
      var modal = document.getElementById('timeModal');
      if (modal){
        document.body.classList.add('overlay-open', 'modal-open');
        modal.classList.add('active');
        if (typeof window.__snout_lockScroll === 'function') window.__snout_lockScroll();
        var slot = modal.querySelector('.time-picker-slot');
        if (slot){
          slot.innerHTML = '';
          if (typeof ORIG_INLINE === 'function'){ ORIG_INLINE(dateId, slot); }
        }
        return;
      }
    }
    if (typeof ORIG_INLINE === 'function') return ORIG_INLINE(dateId, mount);
  };

  /* Route +Add times clicks to openInlineTimePicker (which we override above) */
  document.addEventListener('pointerdown', function(e){
    if (!isMobile()) return;
    var btn = e.target.closest && e.target.closest('.add-times-btn');
    if (!btn) return;
    var item = btn.closest('.selected-date-item'); if (!item) return;
    var id = item.getAttribute('data-date-id');
    var slot = item.querySelector('.time-picker-slot') || document.createElement('div');
    e.preventDefault(); e.stopImmediatePropagation && e.stopImmediatePropagation();
    if (typeof window.openInlineTimePicker === 'function') window.openInlineTimePicker(id, slot);
  }, true);

  /* Close logic: one tap anywhere on the dim backdrop or Done closes immediately */
  var lastOverlayClosedAt = 0;
  function now(){ return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function closeOverlayImmediate(){
    var modal = document.getElementById('timeModal');
    if (modal) modal.classList.remove('active');
    document.body.classList.remove('overlay-open');
    if (typeof window.__snout_unlockScroll === 'function') window.__snout_unlockScroll();
    lastOverlayClosedAt = now();
    // refresh next enabled state
    setTimeout(function(){
      try{
        // Button state will be updated by updateNextButton2 calls
        // Button state will be updated by updateNextButton2 calls
      }catch(_){}
    }, 0);
  }
  window.closeTimeModal = closeOverlayImmediate;

  /* backdrop close on pointerdown + safety click */
  document.addEventListener('pointerdown', function(e){
    var modal = document.getElementById('timeModal');
    if (!modal || !modal.classList.contains('active')) return;
    if (e.target === modal){ e.preventDefault(); e.stopImmediatePropagation && e.stopImmediatePropagation(); closeOverlayImmediate(); }
  }, true);
  
document.addEventListener('click', function(e){
  var modal = document.getElementById('timeModal');
  if (!modal || !modal.classList.contains('active')) return;
  var panel = modal.querySelector('.time-modal-content');
  if (!panel || !panel.contains(e.target)){
    e.preventDefault();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (typeof closeOverlayImmediate === 'function') closeOverlayImmediate();
    else if (typeof closeTimeModal === 'function') closeTimeModal();
  }
}, true);


  /* Done closes instantly at capture */
  document.addEventListener('pointerdown', function(e){
    if (!(document.body.classList.contains('overlay-open'))) return;
    var done = e.target.closest && (e.target.closest('.tp-done') || e.target.closest('[data-inline-done]'));
    if (done){ e.preventDefault(); e.stopImmediatePropagation && e.stopImmediatePropagation(); closeOverlayImmediate(); }
  }, true);

  /* Ignore reroutes while overlay open or just closed */
  document.addEventListener('pointerdown', function(e){
    var t = now();
    if (document.body.classList.contains('overlay-open') || (t - lastOverlayClosedAt) < 250){
      var btn = e.target.closest && e.target.closest('.add-times-btn');
      if (btn){ e.preventDefault(); e.stopImmediatePropagation && e.stopImmediatePropagation(); }
    }
  }, true);
})();

/* === Single-overlay modal control (no background click-through, single tap to close) === */
(function(){
  const overlay = document.getElementById('timeModal');
  const panel   = overlay ? overlay.querySelector('.time-modal-content') : null;
  const appRoot = elements.bookingContainer || document.querySelector('.booking-container');
  let pushedForModal = false;

  // Open
  window.openTimeModal = function() {
    if (!overlay || !panel) return;
    overlay.classList.add('active');
    document.body.classList.add('modal-open','overlay-open');

    // disable background
    if (appRoot) {
      appRoot.setAttribute('inert','');
      appRoot.classList.add('app-inert');
      appRoot.setAttribute('aria-hidden','true');
    }

    // history: one Back press closes modal
    if (!pushedForModal) {
      try{ history.pushState({ timeModal:true }, ''); pushedForModal = true; }catch(e){}
    }

    // focus
    try{ panel.focus(); }catch(e){}
  };

  // Close
  window.closeTimeModal = function() {
    if (!overlay || !panel) return;
    overlay.classList.remove('active');
    document.body.classList.remove('modal-open','overlay-open');

    if (appRoot) {
      appRoot.removeAttribute('inert');
      appRoot.classList.remove('app-inert');
      appRoot.removeAttribute('aria-hidden');
    }

    // keep history sane; do not call history.back() here
    pushedForModal = false;
  };

  if (overlay) {
    // One tap on dim area closes. Never leaks to page.
    overlay.addEventListener('click', function(e){
      if (!panel) return;
      if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); closeTimeModal(); }
    });

    // Taps inside panel should not bubble to overlay
    if (panel) {
      panel.addEventListener('click', (e)=> e.stopPropagation());
    }

    // iOS/Android: block touch bleed-through and scroll underlay
    ['touchstart','touchmove','pointerdown'].forEach(evt => {
      overlay.addEventListener(evt, (e)=>{
        if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); }
      }, { passive:false });
    });

    // Global capture guard outside panel while open
    document.addEventListener('pointerdown', (e)=>{
      if (!overlay.classList.contains('active')) return;
      if (!panel.contains(e.target)) { e.stopPropagation(); e.preventDefault(); }
    }, true);
  }

  // Device/browser Back closes modal first
  window.addEventListener('popstate', (e)=>{
    if (overlay && overlay.classList.contains('active')) {
      closeTimeModal();
      // optional: re-push a clean state so further Back navigates normally
      try{ history.pushState({}, ''); }catch(err){}
    }
  });
})();

