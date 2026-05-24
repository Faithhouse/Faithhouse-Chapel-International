export const nameToPath = (name: string, id?: string | null): string => {
  const norm = name.trim();
  switch (norm) {
    case 'Dashboard': return '/dashboard';
    case 'General Overseer': return '/general-overseer';
    case 'Members': return '/members';
    case 'Member Profile': return id ? `/members/${id}` : '/members';
    case 'Visitors Registry': return '/visitors-registry';
    case 'Attendance': return '/attendance';
    case 'Upcoming Events':
    case 'Events': return '/events';
    case 'Finance': return '/finance';
    case 'Branches': return '/branches';
    case 'Leadership Registry':
    case 'Church Leadership':
    case 'Ministerial & Leadership':
    case 'Leadership & Development': return '/leadership';
    case 'Ministries': return '/ministries';
    case 'Ministry Reports': return '/ministry-reports';
    case 'Visitation & Follow-up':
    case 'Follow-up & Visitation':
    case 'Follow-up & Visitation ministry':
    case 'Visitation Logs': return '/visitation';
    case 'WhatsApp Hub': return '/whatsapp-hub';
    case 'Follow-Up Map': return '/follow-up-map';
    case 'Recurring Tasks': return '/recurring-tasks';
    case 'Facility Management': return '/facility-management';
    case 'Cell Meeting': return '/cell-meeting';
    case 'Users': return '/users';
    case 'Profile': return '/profile';
    case 'Settings': return '/settings';
    
    // Sub ministries
    case 'Children Ministry':
    case "Children's Ministry": return '/ministries/children';
    case 'Teens Ministry': return '/ministries/teens';
    
    // Dynamic departments
    case 'Youth & Children':
    case 'Youth & Children Ministry': return '/ministries/youth-and-children';
    case 'Media Ministry':
    case 'Media Department': return '/ministries/media';
    case 'Music Ministry':
    case 'Music Department': return '/ministries/music';
    case 'Ushering Ministry':
    case 'Ushering Department': return '/ministries/ushering';
    case 'Protocol Ministry':
    case 'Protocol Department': return '/ministries/protocol';
    case 'Prayer Ministry':
    case 'Prayer Department': return '/ministries/prayer';
    case 'Evangelism':
    case 'Evangelism Ministry':
    case 'Evangelism Department': return '/ministries/evangelism';
    
    default: return '/dashboard';
  }
};

export const pathToName = (pathName: string): { name: string; id: string | null } => {
  const clean = pathName.replace(/\/$/, '').toLowerCase();
  
  if (clean === '/dashboard' || clean === '' || clean === '/') return { name: 'Dashboard', id: null };
  if (clean === '/general-overseer') return { name: 'General Overseer', id: null };
  if (clean === '/members') return { name: 'Members', id: null };
  if (clean.startsWith('/members/')) {
    const segments = pathName.split('/');
    const id = segments[2];
    return { name: 'Member Profile', id: id || null };
  }
  if (clean === '/visitors-registry') return { name: 'Visitors Registry', id: null };
  if (clean === '/attendance') return { name: 'Attendance', id: null };
  if (clean === '/events') return { name: 'Events', id: null };
  if (clean === '/finance') return { name: 'Finance', id: null };
  if (clean === '/branches') return { name: 'Branches', id: null };
  if (clean === '/leadership') return { name: 'Leadership & Development', id: null };
  if (clean === '/ministries') return { name: 'Ministries', id: null };
  if (clean === '/ministry-reports') return { name: 'Ministry Reports', id: null };
  if (clean === '/visitation') return { name: 'Follow-up & Visitation', id: null };
  if (clean === '/whatsapp-hub') return { name: 'WhatsApp Hub', id: null };
  if (clean === '/follow-up-map') return { name: 'Follow-Up Map', id: null };
  if (clean === '/recurring-tasks') return { name: 'Recurring Tasks', id: null };
  if (clean === '/facility-management') return { name: 'Facility Management', id: null };
  if (clean === '/cell-meeting') return { name: 'Cell Meeting', id: null };
  if (clean === '/users') return { name: 'Users', id: null };
  if (clean === '/profile') return { name: 'Profile', id: null };
  if (clean === '/settings') return { name: 'Settings', id: null };
  
  if (clean === '/ministries/children') return { name: "Children's Ministry", id: null };
  if (clean === '/ministries/teens') return { name: 'Teens Ministry', id: null };
  if (clean === '/ministries/youth-and-children') return { name: 'Youth & Children Ministry', id: null };
  if (clean === '/ministries/media') return { name: 'Media Department', id: null };
  if (clean === '/ministries/music') return { name: 'Music Department', id: null };
  if (clean === '/ministries/ushering') return { name: 'Ushering Department', id: null };
  if (clean === '/ministries/protocol') return { name: 'Protocol Department', id: null };
  if (clean === '/ministries/prayer') return { name: 'Prayer Department', id: null };
  if (clean === '/ministries/evangelism') return { name: 'Evangelism Department', id: null };

  return { name: 'Dashboard', id: null };
};
