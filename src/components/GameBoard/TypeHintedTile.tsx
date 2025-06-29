import React, { memo } from 'react'
import { GameTile } from '@/types/game'
import { POKEMON_TYPE_COLORS } from '@/types/pokemon'

interface DragInfo {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

interface TypeHintedTileProps {
  tile: GameTile
  showTypeHints: boolean
  isShuffling?: boolean
  dragInfo?: DragInfo | null
  rowIndex?: number
  colIndex?: number
}

const TypeHintedTile = memo(({ tile, showTypeHints, isShuffling = false, dragInfo = null, rowIndex = 0, colIndex = 0 }: TypeHintedTileProps) => {
  // 빈 타일인 경우
  if (tile.isEmpty) {
    return (
      <div
        className="w-15 h-15"
        style={{ pointerEvents: 'none' }}
      />
    )
  }

  // 드래그 중 선택 여부 체크
  const isDragSelected = () => {
    if (!dragInfo || tile.isEmpty) return false
    
    // 타일의 실제 위치 계산 (GameBoard와 동일한 로직)
    const tileSize = 60
    const gap = 12
    const paddingY = 64 // py-16
    const paddingX = 80 // px-20
    
    const tileCenterX = colIndex * (tileSize + gap) + paddingX + (tileSize / 2)
    const tileCenterY = rowIndex * (tileSize + gap) + paddingY + (tileSize / 2)
    
    return tileCenterX >= dragInfo.minX && tileCenterX <= dragInfo.maxX &&
           tileCenterY >= dragInfo.minY && tileCenterY <= dragInfo.maxY
  }

  // 애니메이션 스타일 계산
  const getAnimationStyle = () => {
    if (tile.isRemoving) {
      return {
        transform: `translate(${tile.bounceX || 0}px, ${tile.bounceY || 0}px) scale(0.8)`,
        opacity: 0.6,
        transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        zIndex: 1
      }
    }
    
    if (isShuffling) {
      return {
        transform: 'scale(0.9)',
        opacity: 0.7,
        transition: 'all 0.3s ease-in-out',
        zIndex: 1
      }
    }
  }

  return (
    <div
      data-tile-id={tile.id}
      className={`
        w-15 h-15 rounded-lg flex items-center justify-center transition-all duration-200 overflow-visible relative
        ${tile.isSelected || isDragSelected() ? 'scale-105' : ''}
      `}
      style={{
        ...getAnimationStyle()
      }}
    >
      {/* 타입 힌트 배경 (초보자 모드에서만) */}
      {showTypeHints && (
        <div 
          className="w-15 h-15 rounded-lg absolute"
          style={{
            zIndex: 0,
            background: tile.pokemon.types.length === 1 
              ? POKEMON_TYPE_COLORS[tile.pokemon.types[0]]
              : `linear-gradient(45deg, ${POKEMON_TYPE_COLORS[tile.pokemon.types[0]]} 50%, ${POKEMON_TYPE_COLORS[tile.pokemon.types[1]]} 50%)`,
            opacity: 0.3
          }}
        />
      )}

      {/* 선택된 경우 또는 드래그 중 선택된 경우 뒤에 노란색 실루엣 */}
      {(tile.isSelected || isDragSelected()) && (
        <>
          {[
            { x: -2, y: -2 },
            { x: 2, y: -2 },
            { x: -2, y: 2 },
            { x: 2, y: 2 },
            { x: 0, y: -2 },
            { x: 0, y: 2 },
            { x: -2, y: 0 },
            { x: 2, y: 0 }
          ].map((offset, index) => (
            <img 
              key={index}
              src={tile.pokemon.sprite || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'} 
              alt={`${tile.pokemon.name} silhouette`}
              className="w-16 h-16 object-contain pixel-art absolute pokemon-silhouette"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                zIndex: 1
              }}
              draggable={false}
            />
          ))}
        </>
      )}
      
      {/* 메인 포켓몬 이미지 */}
      <img 
        src={tile.pokemon.sprite || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'} 
        alt={tile.pokemon.name}
        className="w-15 h-15 object-contain pixel-art relative"
        style={{ 
          zIndex: 2
        }}
        draggable={false}
      />
      
      {/* 타입 힌트 툴팁 (호버 시) */}
      {showTypeHints && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 whitespace-nowrap">
          {tile.pokemon.types.join(' / ')}
        </div>
      )}
    </div>
  )
})

TypeHintedTile.displayName = 'TypeHintedTile'

export default TypeHintedTile 