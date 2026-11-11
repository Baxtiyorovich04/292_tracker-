const MEMORY = '292-friend-adds'
const announced = new Set()

function readSeen() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MEMORY) || '[]')
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function friendAddKey(person) {
  return `${person.uid}:${person.createdAt || 0}`
}

export function friendAddLabel(person) {
  const handle = String(person?.handle || '')
  if (handle) return `@${handle}`
  const name = String(person?.displayName || '').trim()
  return name || 'Someone'
}

export function friendAddMessage(people) {
  const labels = (people || []).map(friendAddLabel)
  if (!labels.length) return ''
  if (labels.length === 1) return `${labels[0]} added you as a friend.`
  if (labels.length === 2) return `${labels[0]} and ${labels[1]} added you as a friend.`
  return `${labels[0]}, ${labels[1]}, and ${labels.length - 2} more added you as a friend.`
}

export function takeUnseenFriendAdds(people) {
  const seen = readSeen()
  const fresh = []
  for (const person of people || []) {
    if (!person?.uid) continue
    const key = friendAddKey(person)
    if (seen.has(key) || announced.has(key)) continue
    announced.add(key)
    seen.add(key)
    fresh.push(person)
  }
  if (fresh.length) {
    try {
      localStorage.setItem(MEMORY, JSON.stringify([...seen].slice(-200)))
    } catch {
      // The in-memory set still blocks a second reminder this session.
    }
  }
  return fresh
}
