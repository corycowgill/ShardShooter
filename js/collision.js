// Collision detection system

export function rectsOverlap(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

export function circleRectOverlap(cx, cy, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return (dx * dx + dy * dy) <= (radius * radius);
}

export function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.width &&
         py >= rect.y && py <= rect.y + rect.height;
}

export class CollisionSystem {
  // Check bullets against shard segments
  checkBulletsVsShards(bullets, shardManager, particles, audio, scoring) {
    const results = [];

    for (const bullet of bullets.bullets) {
      if (!bullet.alive) continue;

      const bulletRect = {
        x: bullet.x,
        y: bullet.y,
        width: bullet.width,
        height: bullet.height,
      };

      for (const { chain, segment } of shardManager.getAllSegments()) {
        if (!segment.alive) continue;

        if (rectsOverlap(bulletRect, segment.hitbox)) {
          bullet.alive = false;

          // Bullet impact effect at hit point
          particles.bulletImpact(bullet.x + bullet.width / 2, bullet.y, segment.color);

          const destroyed = segment.hit();
          if (destroyed) {
            // Shard was destroyed
            const splitCount = shardManager.destroySegment(chain, segment);

            particles.shardBreak(segment.centerX, segment.centerY, segment.color);

            if (splitCount > 0) {
              audio.chainSplit();
              scoring.addChainSplitBonus(segment.centerX, segment.centerY);
              particles.chainSplitLightning(segment.centerX, segment.centerY, segment.color);
            } else {
              audio.shardBreak();
            }

            scoring.addShardKill(segment.centerX, segment.centerY);
            particles.scorePopup(segment.centerX, segment.centerY);

            results.push({
              type: 'shard_destroyed',
              x: segment.centerX,
              y: segment.centerY,
              splitCount,
            });
          }
          break; // bullet can only hit one target
        }
      }
    }

    return results;
  }

  // Check bullets against obstacles (bullets are destroyed)
  checkBulletsVsObstacles(bullets, obstacles, particles) {
    for (const bullet of bullets.bullets) {
      if (!bullet.alive) continue;

      const bulletRect = {
        x: bullet.x,
        y: bullet.y,
        width: bullet.width,
        height: bullet.height,
      };

      for (const obs of obstacles.obstacles) {
        if (rectsOverlap(bulletRect, obs.hitbox)) {
          if (particles) {
            particles.bulletImpact(bullet.x + bullet.width / 2, bullet.y, '#00e676');
          }
          bullet.alive = false;
          break;
        }
      }
    }
  }

  // Check player against shard segments
  checkPlayerVsShards(player, shardManager) {
    if (!player.alive || player.isInvincible) return false;

    const playerHitbox = player.hitbox;

    for (const { segment } of shardManager.getAllSegments()) {
      if (!segment.alive) continue;
      if (rectsOverlap(playerHitbox, segment.hitbox)) {
        return true;
      }
    }
    return false;
  }

  // Check player against hazards
  checkPlayerVsHazards(player, hazardManager) {
    if (!player.alive || player.isInvincible) return false;

    const playerHitbox = player.hitbox;

    for (const h of hazardManager.hazards) {
      if (!h.alive) continue;
      if (rectsOverlap(playerHitbox, h.hitbox)) {
        h.alive = false; // hazard is consumed on hit
        return true;
      }
    }

    return false;
  }

  // Check if shard chains have reached the bottom
  checkShardsReachedBottom(shardManager) {
    return shardManager.hasReachedBottom();
  }
}
