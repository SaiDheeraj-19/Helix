/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import * as React from "react";

import type { ISvgIcons } from "../type";

export function PlaneLogo({ className, color = "currentColor" }: ISvgIcons) {
  return (
    <span className={`text-xl font-bold tracking-tight ${className || ''}`} style={{ color }}>
      Helix
    </span>
  );
}
