/**
 * Octopus Energy Rates Card (Mobile-Friendly Edition)
 * GitHub: https://github.com/Mod74/octopus-energy-rates-card-mobile
 * Forked from: lozzd/octopus-energy-rates-card
 *
 * Adds responsive multi-column layouts, mobile breakpoint detection,
 * compact mobile view, container query compatibility, and HACS compliance.
 */
class OctopusEnergyRatesCard extends HTMLElement {
    constructor() {
        super();
        this._cardWidth = 0;
        this._resizeObserver = null;
        this._isMobile = false;
        this._renderedCols = null;
    }

    connectedCallback() {
        if (!this._resizeObserver && typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const width = entry.contentRect ? entry.contentRect.width : this.getBoundingClientRect().width;
                    if (width && Math.abs(width - this._cardWidth) > 15) {
                        this._cardWidth = width;
                        this._handleResize();
                    }
                }
            });
            this._resizeObserver.observe(this);
        }
    }

    disconnectedCallback() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    }

    _handleResize() {
        if (!this._config) return;
        const breakpoint = this._config.mobile_breakpoint || 460;
        const currentIsMobile = this._cardWidth <= breakpoint;
        
        // If mobile state or effective column count changed, re-render if hass state exists
        if (currentIsMobile !== this._isMobile) {
            this._isMobile = currentIsMobile;
            if (this._hass) {
                this._render();
            }
        }
    }

    set hass(hass) {
        this._hass = hass;
        this._render();
    }

    _render() {
        const hass = this._hass;
        if (!hass) return;
        const config = this._config;
        if (!config) return;

        // Initialise the lastRefreshTimestamp
        if (!this.lastRefreshTimestamp) {
            this.lastRefreshTimestamp = 0;
        }

        // Check if the interval has passed
        const currentTime = Date.now();
        const cardRefreshIntervalSecondsInMilliseconds = (config.cardRefreshIntervalSeconds || 60) * 1000;
        if (this.content && (currentTime - this.lastRefreshTimestamp < cardRefreshIntervalSecondsInMilliseconds)) {
            return;
        }
        this.lastRefreshTimestamp = currentTime;

        // Determine width and mobile state
        if (!this._cardWidth && typeof this.getBoundingClientRect === 'function') {
            const rect = this.getBoundingClientRect();
            if (rect.width > 0) {
                this._cardWidth = rect.width;
            }
        }
        const breakpoint = config.mobile_breakpoint || 460;
        const isMobileByWindow = (typeof window !== 'undefined' && window.innerWidth <= breakpoint);
        this._isMobile = this._cardWidth > 0 ? (this._cardWidth <= breakpoint) : isMobileByWindow;

        // Determine effective column count
        let effectiveCols = config.cols || 1;
        if (config.auto_cols) {
            const width = this._cardWidth || (typeof window !== 'undefined' ? window.innerWidth : 400);
            if (width < 340) {
                effectiveCols = 1;
            } else if (width < 620) {
                effectiveCols = 2;
            } else if (width < 900) {
                effectiveCols = 3;
            } else {
                effectiveCols = Math.max(config.cols || 3, 3);
            }
        } else if (this._isMobile) {
            effectiveCols = (config.mobile_cols !== undefined && config.mobile_cols !== null) 
                ? config.mobile_cols 
                : 1;
        }

        if (!this.content) {
            const card = document.createElement('ha-card');
            card.header = config.title;
            this.content = document.createElement('div');
            this.content.className = 'card-content-wrapper';

            const style = document.createElement('style');
            style.textContent = `
            :host {
                display: block;
            }
            .card-content-wrapper {
                padding: 0 16px 16px;
                box-sizing: border-box;
                width: 100%;
            }
            .rates-container {
                width: 100%;
                box-sizing: border-box;
                container-type: inline-size;
                container-name: octopus-rates;
            }
            .rates-wrapper {
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
                gap: 8px 12px;
                width: 100%;
                box-sizing: border-box;
            }
            .rates-col {
                flex: 1 1 0px;
                min-width: 0;
                box-sizing: border-box;
            }
            .rates-col table.sub_table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0px 3px;
                box-sizing: border-box;
            }
            thead th {
                text-align: left;
                padding: 0px;
            }
            td {
                vertical-align: middle;
                padding: 2px 4px;
                box-sizing: border-box;
            }
            tr.rate_row {
                text-align: center;
                transition: transform 0.1s ease;
            }
            tr.rate_row:hover {
                filter: brightness(1.08);
            }
            td.time {
                text-align: center;
                vertical-align: middle;
                font-size: var(--ha-font-size-m, 13px);
                font-family: inherit;
                border-top-left-radius: 6px;
                border-bottom-left-radius: 6px;
                padding: 3px 6px;
                white-space: nowrap;
                color: var(--primary-text-color, #e0e0e0);
                letter-spacing: -0.2px;
            }
            td.time_highlight {
                font-weight: bold;
                color: #ffffff;
            }
            td.current {
                position: relative;
                font-weight: bold;
            }    
            td.current:before {
                content: "";
                position: absolute;
                top: 50%;
                right: 0;
                transform: translateY(-50%);
                width: 0; 
                height: 0; 
                display: block;
                border-top: 6px solid transparent;
                border-bottom: 6px solid transparent;
                border-right: 8px solid var(--primary-text-color, #ffffff);
            }
            td.time_red {
                border-bottom: 2px solid #ef4444;
            }
            td.time_orange {
                border-bottom: 2px solid #f97316;
            }
            td.time_green {
                border-bottom: 2px solid #22c55e;
            }
            td.time_lightgreen {
                border-bottom: 2px solid #16a34a;
            }
            td.time_blue {
                border-bottom: 2px solid #3b82f6;
            }
            td.time_cheapest {
                border-bottom: 2px solid #4ade80;
            }
            td.time_cheapestblue {
                border-bottom: 2px solid #38bdf8;
            }
            td.rate {
                color: white;
                text-align: center;
                vertical-align: middle;
                width: 78px;
                min-width: 68px;
                font-weight: 700;
                font-size: var(--ha-font-size-m, 13px);
                font-variant-numeric: tabular-nums;
                border-top-right-radius: 12px;
                border-bottom-right-radius: 12px;
                padding: 3px 6px;
                box-sizing: border-box;
                white-space: nowrap;
                letter-spacing: -0.2px;
            }
            td.red {
                border: 1px solid #dc2626;
                background-color: #ef4444;
            }
            td.orange {
                border: 1px solid #ea580c;
                background-color: #f97316;
            }
            td.green {
                border: 1px solid #16a34a;
                background-color: #22c55e;
            }
            td.lightgreen {
                border: 1px solid #15803d;
                background-color: #16a34a;
            }
            td.blue {
                border: 1px solid #1d4ed8;
                background-color: #2563eb;
            }
            td.cheapest {
                color: #0f172a;
                font-weight: 800;
                border: 1px solid #4ade80;
                background-color: #86efac;
            }
            td.cheapestblue {
                color: #0f172a;
                font-weight: 800;
                border: 1px solid #38bdf8;
                background-color: #bae6fd;
            }

            /* Mobile-specific responsive rules */
            .is-mobile .card-content-wrapper {
                padding: 0 8px 12px;
            }
            .is-mobile .rates-wrapper {
                gap: 4px;
            }
            .is-mobile .compact-mode td.time {
                font-size: 12px;
                padding: 2px 4px;
            }
            .is-mobile .compact-mode td.rate {
                font-size: 12px;
                padding: 2px 4px;
                width: 68px;
                min-width: 62px;
                border-top-right-radius: 8px;
                border-bottom-right-radius: 8px;
            }
            .is-mobile .compact-mode table.sub_table {
                border-spacing: 0px 2px;
            }
            @media (max-width: 480px) {
                .card-content-wrapper {
                    padding: 0 10px 12px;
                }
                .rates-wrapper {
                    gap: 6px;
                }
            }
            `;
            card.appendChild(style);
            card.appendChild(this.content);
            this.appendChild(card);
        }

        const colours_import = ['lightgreen', 'green', 'orange', 'red', 'blue', 'cheapest', 'cheapestblue'];
        const colours_export = ['red', 'green', 'orange', 'green'];
        const currentEntityId = config.currentEntity;
        const futureEntityId = config.futureEntity;
        const pastEntityId = config.pastEntity;

        const allSlotsTargetTimes = [];
        const targetTimesEntities = (config.targetTimesEntities && Object.keys(config.targetTimesEntities)) || [];
        for (const entityId of targetTimesEntities) {
            const entityTimesState = hass.states[entityId];
            const entityExtraData = config.targetTimesEntities[entityId] || {};
            const backgroundColour = entityExtraData.backgroundColour || "Navy";
            const timePrefix = entityExtraData.prefix || "";
            const entityAttributes = entityTimesState ? this.reverseObject(entityTimesState.attributes) : {};
            const targetTimes = entityAttributes.target_times || [];
            for (const targetTime of targetTimes) {
                allSlotsTargetTimes.push({
                    start: targetTime.start,
                    end: targetTime.end,
                    color: backgroundColour,
                    timePrefix: timePrefix,
                });
            }
        }

        var lowlimit = config.lowlimit;
        var mediumlimit = config.mediumlimit;
        var highlimit = config.highlimit;

        if (isNaN(lowlimit) && hass.states[lowlimit]) {
            lowlimit = parseFloat(hass.states[lowlimit].state);
        }
        if (isNaN(mediumlimit) && hass.states[mediumlimit]) {
            mediumlimit = parseFloat(hass.states[mediumlimit].state);
        }
        if (isNaN(highlimit) && hass.states[highlimit]) {
            highlimit = parseFloat(hass.states[highlimit].state);
        }

        const unitstr = config.unitstr;
        const roundUnits = config.roundUnits;
        const showpast = config.showpast;
        const showday = config.showday;
        const hour12 = config.hour12;
        const cheapest = config.cheapest;
        const combinerate = config.combinerate;
        const multiplier = config.multiplier;
        const rateListLimit = config.rateListLimit;
        const navigatorLanguage = (typeof navigator !== 'undefined') ? (navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language) : 'en-US';
        const language = hass.locale?.language || hass.language || navigatorLanguage || 'en-US';
        const isValidTimeZone = (tz) => {
            if (!tz) return false;
            try {
                new Intl.DateTimeFormat(undefined, { timeZone: tz });
                return true;
            } catch (_error) {
                return false;
            }
        };
        const candidateTimeZones = [
            hass.locale?.time_zone,
            hass.config?.time_zone,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            'UTC',
        ];
        const timeZone = candidateTimeZones.find((tz) => isValidTimeZone(tz));
        const dayFormatter = new Intl.DateTimeFormat(language, { weekday: 'short', timeZone });
        const timeFormatter = new Intl.DateTimeFormat(language, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: hour12,
            hourCycle: hour12 ? 'h12' : 'h23',
            timeZone: timeZone,
        });
        var colours = (config.exportrates ? colours_export : colours_import);
        var combinedRates = [];

        const paststate = hass.states[pastEntityId];
        const currentstate = hass.states[currentEntityId];
        const futurestate = hass.states[futureEntityId];

        const limitEntity = config.limitEntity;
        const limitEntityState = limitEntity ? hass.states[limitEntity] : null;
        const limitHighMult = config.highLimitMultiplier;
        const limitMedMult = config.mediumLimitMultiplier;

        var additionalDynamicLimits = [];
        const additionalDynamicLimitsEntities = (config.additionalDynamicLimits && Object.keys(config.additionalDynamicLimits)) || [];
        for (const entityId of additionalDynamicLimitsEntities) {
            const limitExtraData = config.additionalDynamicLimits[entityId] || {};
            const backgroundColour = limitExtraData.backgroundColour || "";
            const timePrefix = limitExtraData.prefix || "";

            if (hass.states[entityId]) {
                const limit = parseFloat(hass.states[entityId].state);
                if (!isNaN(limit)) {
                    additionalDynamicLimits.push({
                        limit: limit,
                        color: backgroundColour,
                        timePrefix: timePrefix,
                    });
                }
            }
        }

        if (limitEntityState != null) {
            const limitAve = parseFloat(limitEntityState.state);
            if (!isNaN(limitAve)) {
                mediumlimit = limitAve * limitMedMult;
                highlimit = limitAve * limitHighMult;
            }
        }

        if (typeof paststate !== 'undefined' && paststate !== null) {
            const pastattributes = this.reverseObject(paststate.attributes || {});
            const ratesPast = pastattributes.rates || [];
            ratesPast.forEach((key) => combinedRates.push(key));
        }

        if (typeof currentstate !== 'undefined' && currentstate !== null) {
            const currentattributes = this.reverseObject(currentstate.attributes || {});
            const ratesCurrent = currentattributes.rates || [];
            ratesCurrent.forEach((key) => combinedRates.push(key));
        }

        if (!currentstate || !currentstate.attributes || !currentstate.attributes.rates) {
            throw new Error("There are no rates assigned to that entity! Please check integration or chosen entity");
        }

        if (typeof futurestate !== 'undefined' && futurestate !== null) {
            const futureattributes = this.reverseObject(futurestate.attributes || {});
            const ratesFuture = futureattributes.rates || [];
            ratesFuture.forEach((key) => combinedRates.push(key));
        }

        var rates_list_length = 0;
        var cheapest_rate = 5000;
        var previous_rate = 0;
        var rates_currentNumber = 0;
        var previous_rates_day = "";
        var filteredRates = [];
        const nowMs = Date.now();

        combinedRates.forEach((key) => {
            const date_milli = Date.parse(key.start);
            const date = new Date(date_milli);
            const current_rates_day = dayFormatter.format(date);
            const ratesToEvaluate = key.value_inc_vat * multiplier;

            if ((showpast || (date_milli - nowMs > -1800000)) && (rateListLimit == 0 || rates_list_length < rateListLimit)) {
                rates_currentNumber++;

                if ((ratesToEvaluate < cheapest_rate) && (date_milli - nowMs > -1800000)) {
                    cheapest_rate = ratesToEvaluate;
                }

                if (!combinerate) {
                    filteredRates.push(key);
                    rates_list_length++;
                } else if (
                    rates_currentNumber === 1 ||
                    current_rates_day !== previous_rates_day ||
                    previous_rate !== ratesToEvaluate
                ) {
                    filteredRates.push(key);
                    rates_list_length++;
                }
                previous_rate = ratesToEvaluate;
                previous_rates_day = current_rates_day;
            }
        });

        const numCols = Math.max(1, Math.min(effectiveCols, Math.max(1, rates_list_length)));
        const rows_per_col = Math.ceil(rates_list_length / numCols);

        const columnHtmls = [];
        let currentColumnRows = "";
        let x = 1;

        filteredRates.forEach((key) => {
            const date_milli = Date.parse(key.start);
            const date = new Date(date_milli);
            const time_locale = timeFormatter.format(date);
            const date_locale = (showday ? dayFormatter.format(date) + ' ' : '');

            var colour = colours[1];
            var isTargetTime = false;
            var targetTimeBackgroundColor = "";
            var targetTimePrefix = "";

            allSlotsTargetTimes.forEach((targetTime) => {
                const startTime = new Date(targetTime.start);
                const endTime = new Date(targetTime.end);
                if (date >= startTime && date < endTime) {
                    isTargetTime = true;
                    targetTimeBackgroundColor = ` style='background-color: ${targetTime.color};'`;
                    targetTimePrefix = targetTime.timePrefix ? targetTimePrefix + targetTime.timePrefix : targetTimePrefix;
                }
            });

            additionalDynamicLimits.forEach((targetLimit) => {
                if (key.value_inc_vat <= targetLimit.limit) {
                    isTargetTime = true;
                    targetTimeBackgroundColor = ` style='background-color: ${targetLimit.color};'`;
                    targetTimePrefix = targetLimit.timePrefix ? targetTimePrefix + targetLimit.timePrefix : targetTimePrefix;
                }
            });

            targetTimePrefix = targetTimePrefix ? targetTimePrefix + " " : targetTimePrefix;
            var isCurrentTime = false;
            if ((date_milli - nowMs > -1800000) && (date < new Date())) {
                if (showpast) {
                    isCurrentTime = true;
                    targetTimeBackgroundColor = " style='background-color: #64748b;'";
                }
            }

            var valueToDisplay = key.value_inc_vat * multiplier;
            var boldStyle = isCurrentTime ? "current " : "";
            boldStyle = isTargetTime ? boldStyle + "time_highlight" : boldStyle;

            if (cheapest && (valueToDisplay === cheapest_rate && cheapest_rate > 0)) {
                colour = colours[5];
            } else if (cheapest && (valueToDisplay === cheapest_rate && cheapest_rate <= 0)) {
                colour = colours[6];
            } else if (valueToDisplay > highlimit) {
                colour = colours[3];
            } else if (valueToDisplay > mediumlimit) {
                colour = colours[2];
            } else if (valueToDisplay > lowlimit) {
                colour = colours[0];
            } else if (valueToDisplay <= 0) {
                colour = colours[4];
            }

            if (showpast || (date_milli - nowMs > -1800000)) {
                currentColumnRows += `
                    <tr class='rate_row'>
                        <td class='time ${boldStyle} time_${colour}'${targetTimeBackgroundColor}>
                            ${targetTimePrefix}${date_locale}${time_locale}
                        </td>
                        <td class='rate ${colour}'>
                            ${valueToDisplay.toFixed(roundUnits)}${unitstr}
                        </td>
                    </tr>
                `;

                if (x % rows_per_col === 0 || x === rates_list_length) {
                    columnHtmls.push(`
                        <div class="rates-col">
                            <table class="sub_table">
                                <tbody>
                                    ${currentColumnRows}
                                </tbody>
                            </table>
                        </div>
                    `);
                    currentColumnRows = "";
                }
                x++;
            }
        });

        const isMobileClass = this._isMobile ? 'is-mobile' : '';
        const isCompactClass = (config.compact_mobile && this._isMobile) ? 'compact-mode' : '';

        this.content.innerHTML = `
            <div class="rates-container ${isMobileClass} ${isCompactClass}">
                <div class="rates-wrapper" style="--col-count: ${numCols};">
                    ${columnHtmls.join('')}
                </div>
            </div>
        `;
    }

    reverseObject(object) {
        var newObject = {};
        var keys = Object.keys(object || {});
        for (var i = keys.length - 1; i >= 0; i--) {
            newObject[keys[i]] = object[keys[i]];
        }
        return newObject;
    }

    setConfig(config) {
        if (!config.currentEntity) {
            throw new Error('You need to define an entity (e.g. currentEntity: event.octopus_energy_electricity_..._current_day_rates)');
        }

        const defaultConfig = {
            targetTimesEntities: null,
            additionalDynamicLimits: null,
            cols: 1,
            mobile_cols: 1,
            auto_cols: false,
            mobile_breakpoint: 460,
            compact_mobile: true,
            showpast: false,
            showday: false,
            hour12: true,
            title: 'Agile Rates',
            lowlimit: 5,
            mediumlimit: 20,
            highlimit: 30,
            limitEntity: null,
            highLimitMultiplier: 1.1,
            mediumLimitMultiplier: 0.8,
            roundUnits: 2,
            unitstr: 'p/kWh',
            exportrates: false,
            cheapest: false,
            combinerate: false,
            multiplier: 100,
            rateListLimit: 0,
            cardRefreshIntervalSeconds: 60
        };

        this._config = {
            ...defaultConfig,
            ...config,
        };

        if (this._hass) {
            this._render();
        }
    }

    getCardSize() {
        if (!this._config) return 3;
        const cols = this._isMobile ? (this._config.mobile_cols || 1) : (this._config.cols || 1);
        return Math.ceil(24 / cols);
    }
}

if (!customElements.get('octopus-energy-rates-card-mobile')) {
    customElements.define('octopus-energy-rates-card-mobile', OctopusEnergyRatesCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'octopus-energy-rates-card-mobile')) {
    window.customCards.push({
        type: 'octopus-energy-rates-card-mobile',
        name: 'Octopus Energy Rates Card (Mobile Friendly)',
        preview: true,
        description: 'Displays 30-minute energy rates for Octopus Energy tariffs with mobile-responsive layouts',
    });
}
