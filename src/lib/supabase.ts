import { createClient } from '@supabase/supabase-js'
import { GameMode } from '@/types/game'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 타입 정의
export interface User {
  id: number // Back to integer ID for custom auth
  username: string
  nickname: string
  password_hash: string
  normal_best_score: number
  beginner_best_score: number
  created_at: string
}

// 간단한 비밀번호 해시 함수 (실제 프로덕션에서는 bcrypt 사용 권장)
function hashPassword(password: string): string {
  // 간단한 해시 (실제로는 bcrypt 등 사용해야 함)
  return btoa(password + 'pokeapple_salt')
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

// 간단한 인증 함수들
export async function signUp(username: string, nickname: string, password: string) {
  try {
    console.log('SignUp attempt:', { username, nickname, passwordLength: password.length })
    
    // 1. Check if Supabase client is working
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('데이터베이스 연결 오류')
    }
    
    // 2. Check environment variables
    console.log('Environment check:')
    console.log('- Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
    console.log('- Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
    
    // 3. Validate input
    if (!username || username.length < 3) {
      throw new Error('아이디는 3자 이상이어야 합니다')
    }
    if (!nickname || nickname.length < 2) {
      throw new Error('닉네임은 2자 이상이어야 합니다')
    }
    if (!password || password.length < 4) {
      throw new Error('비밀번호는 4자 이상이어야 합니다')
    }
    
    // 4. Check for duplicate username
    console.log('Checking for duplicate username:', username)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', username)
      .maybeSingle()
    
    console.log('Duplicate check result:', { existingUser, checkError })
    
    if (checkError) {
      console.error('Error checking duplicate username:', checkError)
      throw new Error(`사용자명 중복 확인 오류: ${checkError.message}`)
    }
    
    if (existingUser) {
      console.log('Username already exists:', username)
      throw new Error('이미 존재하는 사용자명입니다')
    }
    
    // 5. Check for duplicate nickname
    console.log('Checking for duplicate nickname:', nickname)
    const { data: existingNickname, error: nicknameCheckError } = await supabase
      .from('users')
      .select('id, nickname')
      .eq('nickname', nickname)
      .maybeSingle()
    
    console.log('Nickname duplicate check result:', { existingNickname, nicknameCheckError })
    
    if (nicknameCheckError) {
      console.error('Error checking duplicate nickname:', nicknameCheckError)
      throw new Error(`닉네임 중복 확인 오류: ${nicknameCheckError.message}`)
    }
    
    if (existingNickname) {
      console.log('Nickname already exists:', nickname)
      throw new Error('이미 존재하는 닉네임입니다')
    }
    
    // 6. Create new user
    console.log('Creating new user with data:', { username, nickname })
    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert([{
        username,
        nickname,
        password_hash: hashPassword(password),
        normal_best_score: 0,
        beginner_best_score: 0
      }])
      .select()
      .single()
    
    console.log('User creation result:', { userData, insertError })
    
    if (insertError) {
      console.error('User creation error:', insertError)
      throw new Error(`회원가입 실패: ${insertError.message}`)
    }
    
    if (!userData) {
      throw new Error('사용자 데이터가 생성되지 않았습니다')
    }
    
    console.log('Signup successful for user:', userData.id)
    return userData
    
  } catch (error: unknown) {
    console.error('Complete signup error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

export async function signIn(username: string, password: string) {
  try {
    console.log('SignIn attempt:', { username, passwordLength: password.length })
    
    // 1. Validate input
    if (!username || !password) {
      throw new Error('아이디와 비밀번호를 입력해주세요')
    }
    
    // 2. Find user by username
    console.log('Looking for user:', username)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()
    
    console.log('User lookup result:', { userData: userData ? 'Found' : 'Not found', userError })
    
    if (userError) {
      console.error('User lookup error:', userError)
      if (userError.code === 'PGRST116') {
        throw new Error('존재하지 않는 사용자명입니다')
      }
      throw new Error(`로그인 오류: ${userError.message}`)
    }
    
    if (!userData) {
      throw new Error('사용자를 찾을 수 없습니다')
    }
    
    // 3. Verify password
    console.log('Verifying password for user:', userData.id)
    if (!verifyPassword(password, userData.password_hash)) {
      console.log('Password verification failed')
      throw new Error('비밀번호가 일치하지 않습니다')
    }
    
    console.log('Login successful for user:', userData.id)
    return userData
  } catch (error: unknown) {
    console.error('Complete signin error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    console.log('Getting current user from localStorage...')
    
    // 1. Get user data from localStorage
    const userData = localStorage.getItem('pokeapple_user')
    if (!userData) {
      console.log('No user data in localStorage')
      return null
    }

    const user = JSON.parse(userData)
    console.log('Found user in localStorage:', user.id)
    
    // 2. Verify user still exists in database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    console.log('Database verification result:', { dbUser: dbUser ? 'Found' : 'Not found', dbError })
    
    if (dbError || !dbUser) {
      console.log('User not found in database, clearing localStorage')
      localStorage.removeItem('pokeapple_user')
      return null
    }
    
    // 3. Update localStorage with latest data
    if (JSON.stringify(dbUser) !== userData) {
      console.log('Updating localStorage with latest user data')
      localStorage.setItem('pokeapple_user', JSON.stringify(dbUser))
    }
    
    return dbUser
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function signOut(): Promise<void> {
  try {
    console.log('Signing out user...')
    
    // Simply clear localStorage for custom auth
    localStorage.removeItem('pokeapple_user')
    
    console.log('Successfully signed out')
  } catch (error) {
    console.error('Complete signout error:', error)
    throw error
  }
}

// 게임 점수 관련 함수들 (간소화)
export async function saveGameScore(score: number, mode: GameMode) {
  const user = await getCurrentUser()
  if (!user) throw new Error('로그인이 필요합니다')

  // 현재 최고점수와 비교
  const currentBest = mode === 'normal' ? user.normal_best_score : user.beginner_best_score
  
  if (score > currentBest) {
    // 새로운 최고점수라면 업데이트
    const updateField = mode === 'normal' ? 'normal_best_score' : 'beginner_best_score'
    
    const { error } = await supabase
      .from('users')
      .update({ [updateField]: score })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    
    // localStorage의 사용자 정보도 업데이트
    const updatedUser = { ...user, [updateField]: score }
    localStorage.setItem('pokeapple_user', JSON.stringify(updatedUser))
    
    return { isNewRecord: true, score, previousBest: currentBest }
  }
  
  return { isNewRecord: false, score, currentBest }
}

export async function getRankingsByMode(mode: GameMode, limit = 10) {
  const scoreField = mode === 'normal' ? 'normal_best_score' : 'beginner_best_score'
  
  const { data, error } = await supabase
    .from('users')
    .select('id, username, nickname, normal_best_score, beginner_best_score')
    .order(scoreField, { ascending: false })
    .gt(scoreField, 0) // 0점보다 큰 점수만
    .limit(limit)

  if (error) {
    console.error('Error fetching rankings:', error)
    return []
  }
  
  return data.map((user, index) => ({
    rank: index + 1,
    nickname: user.nickname,
    username: user.username,
    score: mode === 'normal' ? user.normal_best_score : user.beginner_best_score
  }))
}

export async function getUserBestScore(mode: GameMode) {
  const user = await getCurrentUser()
  if (!user) return null

  return mode === 'normal' ? user.normal_best_score : user.beginner_best_score
}

export async function getUserStats() {
  const user = await getCurrentUser()
  if (!user) return null

  return {
    normalBestScore: user.normal_best_score,
    beginnerBestScore: user.beginner_best_score,
    totalBestScore: user.normal_best_score + user.beginner_best_score
  }
}

// 사용자 랭킹 조회 함수
export async function getUserRanking(mode: GameMode) {
  const user = await getCurrentUser()
  if (!user) return null

  const scoreField = mode === 'normal' ? 'normal_best_score' : 'beginner_best_score'
  const userScore = mode === 'normal' ? user.normal_best_score : user.beginner_best_score
  
  // 사용자 점수가 0이면 랭킹 없음
  if (userScore === 0) {
    return null
  }

  // 내 점수보다 높은 점수를 가진 사용자 수를 계산하여 랭킹 구하기
  const { count: higherScoreCount, error: rankError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gt(scoreField, userScore)

  if (rankError) {
    console.error('Error calculating user rank:', rankError)
    return null
  }

  // 전체 플레이어 수 (0점보다 큰 점수를 가진 사용자)
  const { count: totalPlayers, error: totalError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gt(scoreField, 0)

  if (totalError) {
    console.error('Error counting total players:', totalError)
    return null
  }

  const rank = (higherScoreCount || 0) + 1

  return {
    rank,
    score: userScore,
    totalPlayers: totalPlayers || 0
  }
}
