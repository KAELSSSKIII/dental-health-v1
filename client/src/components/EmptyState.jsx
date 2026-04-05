export default function EmptyState({ icon: Icon, title, message, action }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            {Icon && (
                <div className="w-16 h-16 rounded-full bg-border/60 flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-text-secondary" />
                </div>
            )}
            <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
            {message && <p className="text-sm text-text-secondary mb-4">{message}</p>}
            {action}
        </div>
    );
}
