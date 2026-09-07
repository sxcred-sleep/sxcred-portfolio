import type { Project } from '@/data/projects';
export function ProjectArt({ project, detail = false }: { project: Project; detail?: boolean }) {
  return <div className={`project-art art-${project.art} ${detail ? 'art-detail' : ''}`} aria-hidden="true">
    <div className="art-topline"><span>SXCRED®</span><span>{detail ? 'ДЕТАЛИ / КОНЦЕПЦИЯ' : 'МЕСТО ДЛЯ ПРОЕКТА'}</span></div>
    <div className="art-type">{(detail ? 'WORK\nIN PROGRESS' : project.coverText).split('\n').map(line => <span key={line}>{line}</span>)}</div>
    <div className="art-bottomline"><span>{project.art === 'stream' ? 'ТРАНСЛЯЦИЯ СКОРО НАЧНЁТСЯ' : 'НОВАЯ ГЛАВА СКОРО'}</span><span>↗</span></div>
  </div>;
}
