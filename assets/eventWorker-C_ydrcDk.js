(function() {
  "use strict";
  var searchBounds;
  var hasRequiredSearchBounds;
  function requireSearchBounds() {
    if (hasRequiredSearchBounds) return searchBounds;
    hasRequiredSearchBounds = 1;
    function ge(a, y, c, l, h) {
      var i = h + 1;
      while (l <= h) {
        var m = l + h >>> 1, x = a[m];
        var p = c !== void 0 ? c(x, y) : x - y;
        if (p >= 0) {
          i = m;
          h = m - 1;
        } else {
          l = m + 1;
        }
      }
      return i;
    }
    function gt(a, y, c, l, h) {
      var i = h + 1;
      while (l <= h) {
        var m = l + h >>> 1, x = a[m];
        var p = c !== void 0 ? c(x, y) : x - y;
        if (p > 0) {
          i = m;
          h = m - 1;
        } else {
          l = m + 1;
        }
      }
      return i;
    }
    function lt(a, y, c, l, h) {
      var i = l - 1;
      while (l <= h) {
        var m = l + h >>> 1, x = a[m];
        var p = c !== void 0 ? c(x, y) : x - y;
        if (p < 0) {
          i = m;
          l = m + 1;
        } else {
          h = m - 1;
        }
      }
      return i;
    }
    function le(a, y, c, l, h) {
      var i = l - 1;
      while (l <= h) {
        var m = l + h >>> 1, x = a[m];
        var p = c !== void 0 ? c(x, y) : x - y;
        if (p <= 0) {
          i = m;
          l = m + 1;
        } else {
          h = m - 1;
        }
      }
      return i;
    }
    function eq(a, y, c, l, h) {
      while (l <= h) {
        var m = l + h >>> 1, x = a[m];
        var p = c !== void 0 ? c(x, y) : x - y;
        if (p === 0) {
          return m;
        }
        if (p <= 0) {
          l = m + 1;
        } else {
          h = m - 1;
        }
      }
      return -1;
    }
    function norm(a, y, c, l, h, f) {
      if (typeof c === "function") {
        return f(a, y, c, l === void 0 ? 0 : l | 0, h === void 0 ? a.length - 1 : h | 0);
      }
      return f(a, y, void 0, c === void 0 ? 0 : c | 0, l === void 0 ? a.length - 1 : l | 0);
    }
    searchBounds = {
      ge: function(a, y, c, l, h) {
        return norm(a, y, c, l, h, ge);
      },
      gt: function(a, y, c, l, h) {
        return norm(a, y, c, l, h, gt);
      },
      lt: function(a, y, c, l, h) {
        return norm(a, y, c, l, h, lt);
      },
      le: function(a, y, c, l, h) {
        return norm(a, y, c, l, h, le);
      },
      eq: function(a, y, c, l, h) {
        return norm(a, y, c, l, h, eq);
      }
    };
    return searchBounds;
  }
  var searchBoundsExports = requireSearchBounds();
  const eventIdEntityAppear = 1;
  const eventIdDamage = 3;
  const eventIdCharacterConditionEnable = 4;
  const eventIdCharacterConditionDisable = 5;
  const eventIdFinish = 6;
  const eventIdEntityEquipItem = 7;
  const eventIdEntityUnequipItem = 8;
  const eventIdEntityUpdateBody = 9;
  const eventIdEffectState = 10;
  const SCORE_POCKET = 14;
  const SYNTHETIC_CC_BASE = 9e6;
  const EFFECT_STATE_CC_BASE = 91e5;
  const EFFECT_STATE_BUFFS = [
    {
      subType: 21,
      ccId: EFFECT_STATE_CC_BASE + 21,
      // 9_100_021
      durationSec: 20,
      name: "樂器演奏",
      iconSkillId: 10003,
      broadcastToParty: true,
      ignoreZeroValue: true
    }
  ];
  const effectStateBuffBySubType = new Map(
    EFFECT_STATE_BUFFS.map((d) => [d.subType, d])
  );
  new Map(
    EFFECT_STATE_BUFFS.map((d) => [d.ccId, d])
  );
  const isSyntheticCc = (ccId) => ccId >= SYNTHETIC_CC_BASE;
  class PureDamageCollectorManager {
    constructor() {
      this._damages = [];
    }
    get damages() {
      return this._damages;
    }
    onDamage(p) {
      this._damages.push(p);
    }
  }
  const _PureActorManager = class _PureActorManager {
    constructor(_damageCollector) {
      this._damageCollector = _damageCollector;
      this.entityMap = {};
      this.groupMap = {};
      this.damages = [];
      this._syntheticHolders = /* @__PURE__ */ new Set();
    }
    onEvent(event) {
      if (this._syntheticHolders.size) {
        this.flushSyntheticExpiry(event.At);
      }
      if (event.EventId === eventIdEntityAppear) {
        this.onEntityAppear(event);
      }
      const entity = this.entityMap[event.Id];
      switch (event.EventId) {
        case eventIdEntityAppear:
          entity.onEntityAppear(event);
          break;
        case eventIdDamage: {
          const event_ = event;
          this.damages.push(event_);
          if (entity) {
            entity.onApplyDamage(event_);
            entity.group.onApplyDamage(event_);
          }
          let targetEntity = this.entityMap[event_.TargetId];
          if (!targetEntity) {
            this.onEntityAppear({
              Id: event_.TargetId,
              EventId: 1,
              At: Date.now() / 1e3,
              Name: `unknown:${event_.TargetId}`,
              RaceId: 10001,
              Height: 1,
              Weight: 1,
              Upper: 1,
              Lower: 1,
              GuildName: "",
              OwnerId: ""
            });
            targetEntity = this.entityMap[event_.TargetId];
          }
          targetEntity.onTakeDamage(event_);
          targetEntity.group.onTakeDamage(event_);
          break;
        }
        case eventIdCharacterConditionEnable:
          if (!entity) return;
          entity.onCharacterConditionEnable(
            event
          );
          break;
        case eventIdCharacterConditionDisable:
          if (!entity) return;
          entity.onCharacterConditionDisable(
            event
          );
          break;
        case eventIdFinish:
          if (!entity) return;
          entity.onFinish(event);
          break;
        case eventIdEntityEquipItem:
          if (!entity) return;
          entity.onEquipItem(event);
          break;
        case eventIdEntityUnequipItem:
          if (!entity) return;
          entity.onUnequipItem(event);
          break;
        case eventIdEntityUpdateBody:
          if (!entity) return;
          entity.onUpdateBody(event);
          break;
        case eventIdEffectState:
          this.onEffectState(event);
          break;
      }
    }
    // effect-state buff（op 0x9093 / EventId 10）。封包僅為啟動脈衝、不帶 CCId，
    // 故合成一個固定時長的 condition 套到隊伍 PC 身上。
    onEffectState(event) {
      const def = effectStateBuffBySubType.get(event.SubType);
      if (!def) return;
      if (def.ignoreZeroValue && event.Value === 0) return;
      const disableAt = event.At + def.durationSec;
      const sourceItemId = this.entityMap[event.Id]?.equipItemMap[SCORE_POCKET]?.ItemId;
      const eligible = (e) => !!e && _PureActorManager.pcRaceSet.has(e.raceId) && !e.name.startsWith("unknown:");
      if (Array.isArray(event.Targets) && event.Targets.length > 0) {
        for (const tid of event.Targets) {
          const e = this.entityMap[tid];
          if (eligible(e)) {
            e.applySyntheticDebuff(
              def.ccId,
              event.At,
              disableAt,
              event.Id,
              sourceItemId
            );
          }
        }
        return;
      }
      if (def.broadcastToParty) {
        for (const id in this.entityMap) {
          const e = this.entityMap[id];
          if (eligible(e)) {
            e.applySyntheticDebuff(
              def.ccId,
              event.At,
              disableAt,
              event.Id,
              sourceItemId
            );
          }
        }
      } else {
        const e = this.entityMap[event.Id];
        if (eligible(e)) {
          e.applySyntheticDebuff(
            def.ccId,
            event.At,
            disableAt,
            event.Id,
            sourceItemId
          );
        }
      }
    }
    registerSyntheticHolder(e) {
      this._syntheticHolders.add(e);
    }
    unregisterSyntheticHolder(e) {
      this._syntheticHolders.delete(e);
    }
    flushSyntheticExpiry(now) {
      for (const e of [...this._syntheticHolders]) {
        e.flushSyntheticExpiry(now);
      }
    }
    onEntityAppear(event) {
      const { Id, RaceId, Name } = event;
      const groupKey = _PureActorManager.groupTargetKey(event);
      if (!this.groupMap[groupKey]) {
        this.groupMap[groupKey] = new PureGroupActor(
          this,
          groupKey,
          RaceId,
          Name
        );
      }
      const group = this.groupMap[groupKey];
      let entity = this.entityMap[Id];
      const isNewEntity = !entity;
      const dummyEntity = entity?.name.startsWith("unknown:");
      if (isNewEntity || dummyEntity) {
        if (isNewEntity) {
          entity = new PureEntityActor(this, Id, RaceId, Name, group);
          this.entityMap[Id] = group.entityMap[Id] = entity;
        }
        for (const v of this.damages) {
          if (v.Id === Id) {
            entity.onApplyDamage(v);
            entity.group.onApplyDamage(v);
          } else if (v.TargetId === Id) {
            entity.onTakeDamage(v);
            entity.group.onTakeDamage(v);
          }
        }
      }
    }
    onEntityDamage(event) {
      this._damageCollector.onDamage(event);
    }
    static groupTargetKey(event) {
      if (_PureActorManager.pcRaceSet.has(event.RaceId)) {
        return event.Id;
      }
      return `${event.RaceId}`;
    }
  };
  _PureActorManager.pcRaceSet = /* @__PURE__ */ new Set([
    8001,
    8002,
    9001,
    9002,
    10001,
    10002
  ]);
  let PureActorManager = _PureActorManager;
  class PureBaseActor {
    constructor(mgr, id, raceId, name) {
      this.mgr = mgr;
      this._body = { Height: 1, Weight: 1, Upper: 1, Lower: 1 };
      this._totalTakeDamage = 0;
      this._takeDamages = [];
      this._totalApplyDamage = 0;
      this._applyDamages = [];
      this._id = id;
      this._raceId = raceId;
      this._name = name;
      this._isPC = PureActorManager.pcRaceSet.has(raceId);
    }
    get id() {
      return this._id;
    }
    get raceId() {
      return this._raceId;
    }
    get name() {
      return this._name;
    }
    get body() {
      return this._body;
    }
    get totalTakeDamage() {
      return this._totalTakeDamage;
    }
    get takeDamages() {
      return this._takeDamages;
    }
    get totalApplyDamage() {
      return this._totalApplyDamage;
    }
    get applyDamages() {
      return this._applyDamages;
    }
    get isPC() {
      return this._isPC;
    }
    onEntityAppear(_event) {
    }
    onTakeDamage(_event) {
    }
    onApplyDamage(_event) {
    }
    onCharacterConditionEnable(_event) {
    }
    onCharacterConditionDisable(_event) {
    }
    onFinish(_event) {
    }
    onEquipItem(_event) {
    }
    onUnequipItem(_event) {
    }
    onUpdateBody(event) {
      this._body.Height = event.Height;
      this._body.Weight = event.Weight;
      this._body.Upper = event.Upper;
      this._body.Lower = event.Lower;
    }
  }
  class PureEntityActor extends PureBaseActor {
    constructor(mgr, id, raceId, name, group) {
      super(mgr, id, raceId, name);
      this._guildName = "";
      this._ownerId = "";
      this._finisherId = "";
      this._conditionMap = {};
      this._conditionHistory = [];
      this._equipItemMap = {};
      this._group = group;
    }
    get guildName() {
      return this._guildName;
    }
    get ownerId() {
      return this._ownerId;
    }
    get finisherId() {
      return this._finisherId;
    }
    get group() {
      return this._group;
    }
    get conditionMap() {
      return this._conditionMap;
    }
    get conditionHistory() {
      return this._conditionHistory;
    }
    get equipItemMap() {
      return this._equipItemMap;
    }
    onEntityAppear(event) {
      this._name = event.Name;
      this._raceId = event.RaceId;
      this._finisherId = "";
      this._guildName = event.GuildName;
      this._ownerId = event.OwnerId;
      this._body.Height = event.Height;
      this._body.Weight = event.Weight;
      this._body.Upper = event.Upper;
      this._body.Lower = event.Lower;
      if (PureActorManager.pcRaceSet.has(event.RaceId)) {
        return;
      }
      this._totalTakeDamage = 0;
      this._takeDamages.length = 0;
    }
    onTakeDamage(event) {
      const attacker = this.mgr.entityMap[event.Id];
      const damage = {
        ...event,
        Conditions: attacker?.getConditionState(event.At) ?? [],
        TargetConditions: this.getConditionState(event.At),
        PetId: ""
      };
      this._totalTakeDamage += event.Damage;
      this._takeDamages.push(damage);
    }
    onApplyDamage(event) {
      const attackerId = event.Id;
      const attacker = this.mgr.entityMap[attackerId];
      const targetId = event.TargetId;
      const target = this.mgr.entityMap[targetId];
      if (!target || !(target instanceof PureEntityActor)) {
        return;
      }
      const damage = {
        ...event,
        Conditions: this.getConditionState(event.At),
        TargetConditions: target.getConditionState(event.At),
        PetId: ""
      };
      if (attacker?.ownerId) {
        damage.PetId = attackerId;
        damage.Id = attacker.ownerId;
      }
      this._totalApplyDamage += event.Damage;
      this._applyDamages.push(damage);
      this.mgr.onEntityDamage(damage);
    }
    onCharacterConditionEnable(event) {
      this._conditionMap[event.CCId] = {
        Id: event.Id,
        At: event.At,
        CCId: event.CCId,
        DisableAt: event.DisableAt,
        AttackerId: event.AttackerId
      };
      const prev = this._conditionHistory.length ? this._conditionHistory[this._conditionHistory.length - 1].List : [];
      const current = Object.values(this._conditionMap).sort(
        (a, b) => a.CCId - b.CCId
      );
      const needUpdate = prev.length !== current.length || !prev.every((v, i) => v.CCId === current[i].CCId);
      if (needUpdate) {
        this._conditionHistory.push({ At: event.At, List: current });
      }
    }
    onCharacterConditionDisable(event) {
      delete this._conditionMap[event.CCId];
      const prev = this._conditionHistory.length ? this._conditionHistory[this._conditionHistory.length - 1].List : [];
      const current = Object.values(this._conditionMap).sort(
        (a, b) => a.CCId - b.CCId
      );
      const needUpdate = prev.length !== current.length || !prev.every((v, i) => v.CCId === current[i].CCId);
      if (needUpdate) {
        this._conditionHistory.push({ At: event.At, List: current });
      }
    }
    /** 套用合成 buff（effect-state）；同 CCId 已存在時為續期：保留起始 At、延長 DisableAt。 */
    applySyntheticDebuff(ccId, at, disableAt, attackerId, sourceItemId) {
      const existing = this._conditionMap[ccId];
      if (existing) {
        existing.DisableAt = Math.max(existing.DisableAt, disableAt);
        existing.AttackerId = attackerId;
        if (sourceItemId !== void 0) {
          existing.SourceItemId = sourceItemId;
        }
        this.mgr.registerSyntheticHolder(this);
        return;
      }
      this._conditionMap[ccId] = {
        Id: this._id,
        At: at,
        CCId: ccId,
        DisableAt: disableAt,
        AttackerId: attackerId,
        SourceItemId: sourceItemId
      };
      this._recordConditionSnapshot(at);
      this.mgr.registerSyntheticHolder(this);
    }
    /** 回收已過期（DisableAt <= now）的合成 buff，並在 DisableAt 補一筆 history 快照。 */
    flushSyntheticExpiry(now) {
      for (const k in this._conditionMap) {
        const c = this._conditionMap[k];
        if (isSyntheticCc(c.CCId) && c.DisableAt <= now) {
          delete this._conditionMap[k];
          this._recordConditionSnapshot(c.DisableAt);
        }
      }
      if (!this._hasSyntheticDebuff()) {
        this.mgr.unregisterSyntheticHolder(this);
      }
    }
    _hasSyntheticDebuff() {
      for (const k in this._conditionMap) {
        if (isSyntheticCc(this._conditionMap[k].CCId)) {
          return true;
        }
      }
      return false;
    }
    _recordConditionSnapshot(at) {
      const last = this._conditionHistory.length ? this._conditionHistory[this._conditionHistory.length - 1] : void 0;
      const prev = last ? last.List : [];
      const current = Object.values(this._conditionMap).sort(
        (a, b) => a.CCId - b.CCId
      );
      const needUpdate = prev.length !== current.length || !prev.every((v, i) => v.CCId === current[i].CCId);
      if (needUpdate) {
        this._conditionHistory.push({
          At: last ? Math.max(at, last.At) : at,
          List: current
        });
      }
    }
    onFinish(event) {
      this._finisherId = event.AttackerId;
    }
    onEquipItem(event) {
      this._equipItemMap[event.PocketType] = event;
    }
    onUnequipItem(event) {
      delete this._equipItemMap[event.PocketType];
    }
    getConditionState(at) {
      const idx = searchBoundsExports.le(
        this._conditionHistory,
        { At: at },
        (a, b) => a.At - b.At
      );
      if (idx < 0) return [];
      return this._conditionHistory[idx].List;
    }
  }
  class PureGroupActor extends PureBaseActor {
    constructor(mgr, id, raceId, name) {
      const groupName = PureActorManager.pcRaceSet.has(raceId) ? name : `${raceId}`;
      super(mgr, id, raceId, groupName);
      this.entityMap = {};
    }
    onEntityAppear(event) {
      this._name = PureActorManager.pcRaceSet.has(event.RaceId) ? event.Name : `${event.RaceId}`;
      this._raceId = event.RaceId;
      if (PureActorManager.pcRaceSet.has(event.RaceId)) {
        return;
      }
      const target = this.entityMap[event.Id];
      if (!target) return;
      this._takeDamages = this._takeDamages.filter((v) => v.Id !== event.Id);
      this._totalTakeDamage = this._takeDamages.reduce(
        (acc, v) => acc + v.Damage,
        0
      );
    }
    onTakeDamage(event) {
      const attacker = this.mgr.entityMap[event.Id];
      const target = this.entityMap[event.TargetId];
      if (!target) return;
      const damage = {
        ...event,
        Conditions: attacker?.getConditionState(event.At) ?? [],
        TargetConditions: target.getConditionState(event.At),
        PetId: ""
      };
      this._totalTakeDamage += event.Damage;
      this._takeDamages.push(damage);
    }
  }
  self.onmessage = (e) => {
    if (e.data.type !== "process") return;
    try {
      const snapshot = process(e.data.ndjson);
      const msg = { type: "done", snapshot };
      self.postMessage(msg);
    } catch (err) {
      const msg = { type: "error", message: String(err) };
      self.postMessage(msg);
    }
  };
  function process(ndjson) {
    const dcMgr = new PureDamageCollectorManager();
    const actorMgr = new PureActorManager(dcMgr);
    const events = [];
    let lastPos = 0;
    const total = ndjson.length;
    let lastReportedPct = -1;
    while (lastPos < total) {
      const nextPos = ndjson.indexOf("\n", lastPos);
      if (nextPos < 0) break;
      const line = ndjson.substring(lastPos, nextPos).trim();
      lastPos = nextPos + 1;
      if (!line) continue;
      try {
        events.push(JSON.parse(line));
      } catch {
        continue;
      }
      const pct = Math.floor(lastPos / total * 50);
      if (pct > lastReportedPct) {
        lastReportedPct = pct;
        const msg = {
          type: "progress",
          pct,
          phase: "parse"
        };
        self.postMessage(msg);
      }
    }
    const eventCount = events.length;
    lastReportedPct = 49;
    for (let i = 0; i < eventCount; i++) {
      actorMgr.onEvent(events[i]);
      const pct = 50 + Math.floor(i / eventCount * 50);
      if (pct > lastReportedPct) {
        lastReportedPct = pct;
        const msg = {
          type: "progress",
          pct,
          phase: "process"
        };
        self.postMessage(msg);
      }
    }
    const entities = {};
    for (const [id, e] of Object.entries(actorMgr.entityMap)) {
      entities[id] = {
        id: e.id,
        raceId: e.raceId,
        name: e.name,
        guildName: e.guildName,
        ownerId: e.ownerId,
        finisherId: e.finisherId,
        body: { ...e.body },
        totalTakeDamage: e.totalTakeDamage,
        takeDamages: e.takeDamages,
        totalApplyDamage: e.totalApplyDamage,
        applyDamages: e.applyDamages,
        conditionMap: { ...e.conditionMap },
        conditionHistory: e.conditionHistory,
        equipItemMap: { ...e.equipItemMap },
        groupKey: PureActorManager.groupTargetKey({
          Id: id,
          RaceId: e.raceId
        })
      };
    }
    const groups = {};
    for (const [key, g] of Object.entries(actorMgr.groupMap)) {
      groups[key] = {
        id: g.id,
        raceId: g.raceId,
        name: g.name,
        body: { ...g.body },
        totalTakeDamage: g.totalTakeDamage,
        takeDamages: g.takeDamages
      };
    }
    return {
      entities,
      groups,
      damages: actorMgr.damages,
      collectorDamages: dcMgr.damages
    };
  }
})();
//# sourceMappingURL=eventWorker-C_ydrcDk.js.map
